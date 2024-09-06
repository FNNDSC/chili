import { Command } from "commander";
import {
  chrisIO,
  ChrisIO,
  chrisContext,
  errorStack,
  ChRISEmbeddedResourceGroup,
  ListOptions,
  FileBrowserFolder,
  FilteredResourceData,
  createObjContext,
} from "@fnndsc/cumin";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import cliProgress from "cli-progress";
import { displayTable, TableOptions, drawBorder } from "../screen/screen.js";
import { FileGroupHandler } from "../filesystem/fileGroupHandler.js";
import { optionsToParams } from "../utils/cli.js";
import archy from "archy";

interface TransferCLI {
  hostpath: string;
}

interface DownloadCLI {
  hostdir: string;
  chrisdir: string;
}

interface FileInfo {
  id: number;
  hostPath: string;
  chrisPath: string;
  size: number;
  isLink: boolean;
  linkTarget: string;
}

interface ScanRecord {
  fileInfo: FileInfo[];
  totalSize: number;
}

interface TransferDetail {
  startTime: number;
  endTime: number;
  totalFiles: number;
  transferredCount: number;
  failedCount: number;
  transferSize: number;
  speed: number;
  duration: number;
}

interface Tranmission {
  speed: number;
  duration: number;
}

interface ResourceGroups {
  filesGroup: ChRISEmbeddedResourceGroup<FileBrowserFolder>;
  dirsGroup: ChRISEmbeddedResourceGroup<FileBrowserFolder>;
  linksGroup: ChRISEmbeddedResourceGroup<FileBrowserFolder>;
}

interface CLIscan {
  tree?: boolean;
  follow?: boolean;
  silent?: boolean;
  hostpath?: string;
}

function createSummaryTable(summary: TransferDetail): string[][] {
  const summaryTable: string[][] = [
    ["Total files", summary.totalFiles.toString()],
    [
      "Successfully transferred",
      chalk.green(summary.transferredCount.toString()),
    ],
    ["Failed to transfer", chalk.red(summary.failedCount.toString())],
    [
      "Total data transferred",
      chalk.blueBright(formatBytes(summary.transferSize)),
    ],
    [
      "Average transfer speed",
      chalk.blueBright(`${formatBytes(summary.speed)}/s`),
    ],
    ["Duration", `${summary.duration.toFixed(2)} seconds`],
  ];

  return summaryTable;
}

async function createResourceGroups(
  currentPath: string
): Promise<ResourceGroups | null> {
  try {
    const filesGroup = (await createObjContext(
      "ChRISFilesContext",
      `folder:${currentPath}`
    )) as ChRISEmbeddedResourceGroup<FileBrowserFolder>;
    const dirsGroup = (await createObjContext(
      "ChRISDirsContext",
      `folder:${currentPath}`
    )) as ChRISEmbeddedResourceGroup<FileBrowserFolder>;
    const linksGroup = (await createObjContext(
      "ChRISLinksContext",
      `folder:${currentPath}`
    )) as ChRISEmbeddedResourceGroup<FileBrowserFolder>;

    return { filesGroup, dirsGroup, linksGroup };
  } catch (error) {
    errorStack.push(
      "error",
      `Failed to create ChRISEmbeddedResourceGroup objects for path ${currentPath}: ${error}`
    );
    return null;
  }
}

function createArchyTree(files: FileInfo[]): string {
  interface ArchyNode {
    label: string;
    nodes: { [key: string]: ArchyNode };
  }

  const root: ArchyNode = { label: "", nodes: {} };

  files.forEach((file: FileInfo) => {
    if (file.chrisPath) {
      const parts: string[] = file.chrisPath.split("/").filter(Boolean);
      let current: ArchyNode = root;
      parts.forEach((part: string, index: number) => {
        if (!current.nodes[part]) {
          current.nodes[part] = { label: part, nodes: {} };
        }
        current = current.nodes[part];
        if (index === parts.length - 1 && file.isLink) {
          current.label += ` -> ${file.linkTarget}`;
        }
      });
    }
  });

  function convertToArchyFormat(node: ArchyNode): archy.Data {
    return {
      label: node.label,
      nodes: Object.values(node.nodes).map(convertToArchyFormat),
    };
  }

  return archy(convertToArchyFormat(root));
}

async function chrisFS_scan(
  chrisPath: string,
  hostBasePath: string,
  followLinks: boolean = false
): Promise<ScanRecord | null> {
  const files: FileInfo[] = [];
  let totalSize: number = 0;

  async function walkChrisDir(
    currentPath: string,
    linkedPath: string = ""
  ): Promise<void> {
    const resourceGroups: ResourceGroups | null = await createResourceGroups(
      currentPath
    );
    if (!resourceGroups) return;

    const { filesGroup, dirsGroup, linksGroup } = resourceGroups;

    // Process files
    const fileResults: FilteredResourceData | void =
      await filesGroup.asset.resources_listAndFilterByOptions(
        optionsToParams({ fields: "id,fname,fsize" })
      );
    if (fileResults && fileResults.tableData) {
      for (const file of fileResults.tableData) {
        const size: number = parseInt(file.fsize, 10);
        file.fname = "/" + file.fname;
        const relativeChrisPath: string = linkedPath
          ? path.join(linkedPath, path.basename(file.fname))
          : file.fname;
        const fileInfo: FileInfo = {
          id: parseInt(file.id, 10),
          hostPath: path.join(
            hostBasePath,
            path.relative(chrisPath, relativeChrisPath)
          ),
          chrisPath: relativeChrisPath,
          size: isNaN(size) ? 0 : size,
          isLink: !!linkedPath,
          linkTarget: linkedPath ? file.fname : "",
        };
        files.push(fileInfo);
        totalSize += fileInfo.size;
      }
    }

    // Process links
    const linkResults: FilteredResourceData | void =
      await linksGroup.asset.resources_listAndFilterByOptions(
        optionsToParams({ fields: "path,fname" })
      );
    if (linkResults && linkResults.tableData) {
      for (const link of linkResults.tableData) {
        link.path = "/" + link.path;
        link.fname = "/" + link.fname;
        if (followLinks) {
          await walkChrisDir(link.path, link.fname);
        } else {
          const linkInfo: FileInfo = {
            id: parseInt(link.id, 10),
            hostPath: path.join(
              hostBasePath,
              path.relative(chrisPath, link.fname)
            ),
            chrisPath: link.fname,
            isLink: true,
            linkTarget: link.path,
            size: 0,
          };
          files.push(linkInfo);
        }
      }
    }

    // Process directories
    const dirResults: FilteredResourceData | void =
      await dirsGroup.asset.resources_listAndFilterByOptions(
        optionsToParams({ fields: "path" })
      );
    if (dirResults && dirResults.tableData) {
      for (const dir of dirResults.tableData) {
        dir.path = "/" + dir.path;
        await walkChrisDir(
          dir.path,
          linkedPath ? path.join(linkedPath, path.basename(dir.path)) : ""
        );
      }
    }
  }

  try {
    await walkChrisDir(chrisPath);
    return { fileInfo: files, totalSize };
  } catch (error) {
    errorStack.push("error", `Failed to scan ChRIS filesystem: ${error}`);
    return null;
  }
}

async function scan(options: CLIscan): Promise<ScanRecord | null> {
  const chrisFolder: string | undefined = chrisContext.getCurrent("folder");
  if (!chrisFolder) {
    console.error(
      chalk.red("No ChRIS folder context set. Use 'folder=' to set a context.")
    );
    return null;
  }

  if (!options.silent) {
    console.log(
      chalk.cyan(`Scanning for all files recursively from ${chrisFolder}`)
    );
  }

  // Set hostBasePath to the current working directory
  const hostBasePath: string = options.hostpath || process.cwd();
  const scanResult: ScanRecord | null = await chrisFS_scan(
    chrisFolder,
    hostBasePath,
    options.follow
  );

  if (!scanResult) {
    console.error(chalk.red("Failed to scan ChRIS filesystem."));
    return null;
  }

  if (options.tree) {
    console.log(createArchyTree(scanResult.fileInfo));
  } else {
    if (!options.silent) {
      scanResult.fileInfo.forEach((file: FileInfo) => {
        if (file.isLink && !options.follow) {
          console.log(`${file.chrisPath} -> ${file.linkTarget}`);
        } else {
          console.log(`${file.chrisPath}`);
        }
      });
    }
  }
  if (!options.silent) {
    console.log(
      chalk.green(`Total size: ${formatBytes(scanResult.totalSize)}`)
    );
  }
  return scanResult;
}

async function getFilesToUpload(
  hostpath: string,
  chrisdir: string
): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
  let idCounter: number = 1;

  async function walkDir(
    currentPath: string,
    currentChrisPath: string
  ): Promise<void> {
    const entries: fs.Dirent[] = await fs.promises.readdir(currentPath, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const hostFilePath: string = path.join(currentPath, entry.name);
      const chrisFilePath: string = path.join(currentChrisPath, entry.name);

      if (entry.isDirectory()) {
        await walkDir(hostFilePath, chrisFilePath);
      } else {
        files.push({
          id: idCounter++,
          hostPath: hostFilePath,
          chrisPath: chrisFilePath,
          isLink: false, // Assuming local files are not symlinks
          size: (await fs.promises.stat(hostFilePath)).size,
          linkTarget: "",
        });
      }
    }
  }

  await walkDir(hostpath, chrisdir);
  return files;
}

async function localFS_scan(options: TransferCLI): Promise<ScanRecord | null> {
  chrisContext.currentContext_update();
  chrisIO.chrisFolder = chrisContext.singleContext.folder;
  const initOK: boolean | null = await chrisIO.initialize();
  if (!initOK) {
    console.log(
      drawBorder(
        chalk.red(errorStack.searchMessagesOfType("error", "FileBrowserFolder"))
      )
    );
    console.log(drawBorder(chalk.red("Failed to initialize ChRIS folder.")));
    return null;
  }

  console.log(drawBorder(chalk.cyan("Scanning files to upload...")));
  const filesToUpload: FileInfo[] = await getFilesToUpload(
    options.hostpath,
    chrisContext.singleContext.folder
  );

  let totalSize: number = 0;
  for (const file of filesToUpload) {
    if (file.hostPath) {
      const stats: fs.Stats = await fs.promises.stat(file.hostPath);
      totalSize += stats.size;
    }
  }
  return {
    fileInfo: filesToUpload,
    totalSize: totalSize,
  };
}

function progressBar_setupAndStart(
  scanRecord: ScanRecord
): cliProgress.SingleBar {
  const progressBar: cliProgress.SingleBar = new cliProgress.SingleBar(
    {
      format:
        "Transferring [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} files | {bytes}/{totalBytes}",
    },
    cliProgress.Presets.shades_classic
  );
  progressBar.start(scanRecord.fileInfo.length, 0, {
    bytes: "0 B",
    totalBytes: formatBytes(scanRecord.totalSize),
  });
  return progressBar;
}

function transferDetail_init(): TransferDetail {
  const uploadSummary: TransferDetail = {
    startTime: 0 as number,
    endTime: 0 as number,
    totalFiles: 0 as number,
    transferredCount: 0 as number,
    failedCount: 0 as number,
    transferSize: 0 as number,
    speed: 0 as number,
    duration: 0 as number,
  };
  return uploadSummary;
}

function transmissionSummary_do(transfer: TransferDetail): Tranmission {
  let transmission: Tranmission = {
    duration: 0,
    speed: 0,
  };
  transfer.endTime = Date.now();
  transmission.duration = (transfer.endTime - transfer.startTime) / 1000; // in seconds
  transmission.speed = transfer.transferSize / transmission.duration; // bytes per second
  return transmission;
}

function pulledParentDir_resolve(): string {
  const chrisFolder: string | undefined = chrisContext.getCurrent("folder");
  if (!chrisFolder) {
    return "";
  }
  if (chrisFolder.endsWith("/")) {
    return "";
  }
  return path.basename(chrisFolder);
}

async function chris_pull(
  scanRecord: ScanRecord,
  progressBar: cliProgress.SingleBar
): Promise<TransferDetail> {
  let summary: TransferDetail = transferDetail_init();
  summary.startTime = Date.now();
  const parentDir: string = pulledParentDir_resolve();
  const baseDir: string = process.cwd();
  for (const [index, file] of scanRecord.fileInfo.entries()) {
    try {
      if (!file.hostPath) {
        continue;
      }
      const fileBuffer: Buffer | null = await chrisIO.file_download(file.id);

      if (fileBuffer) {
        const relativePath: string = path.relative(baseDir, file.hostPath);
        const hostPath: string = path.join(baseDir, parentDir, relativePath);
        const dirPath: string = path.dirname(hostPath);

        // Create parent directory if it doesn't exist
        fs.mkdirSync(dirPath, { recursive: true });

        // Write the file
        fs.writeFileSync(hostPath, fileBuffer);

        summary.transferredCount++;
        summary.transferSize += fileBuffer.length;
      } else {
        summary.failedCount++;
        console.log(chalk.yellow(`Failed to download: ${file.hostPath}`));
      }
    } catch (error: unknown) {
      summary.failedCount++;
      console.log(
        chalk.red(
          `Error downloading ${file.hostPath}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }

    progressBar.update(index + 1, {
      bytes: formatBytes(summary.transferSize),
    });
  }

  const transmission: Tranmission = transmissionSummary_do(summary);
  progressBar.stop();

  summary.totalFiles = scanRecord.fileInfo.length;
  summary.duration = transmission.duration;
  summary.speed = transmission.speed;

  return summary;
}

async function chris_push(
  scanRecord: ScanRecord,
  progressBar: cliProgress.SingleBar
): Promise<TransferDetail> {
  let summary: TransferDetail = transferDetail_init();
  summary.startTime = Date.now();

  for (const [index, file] of scanRecord.fileInfo.entries()) {
    try {
      if (!file.hostPath) {
        continue;
      }
      const fileContent: Buffer = await fs.promises.readFile(file.hostPath);
      const fileBlob: Blob = new Blob([fileContent]);
      const uploadResult: boolean = await chrisIO.file_upload(
        fileBlob,
        file.chrisPath
      );

      if (uploadResult) {
        summary.transferredCount++;
        summary.transferSize += fileContent.length;
      } else {
        summary.failedCount++;
        console.log(chalk.yellow(`Failed to upload: ${file.hostPath}`));
      }
    } catch (error: unknown) {
      summary.failedCount++;
      console.log(
        chalk.red(
          `Error uploading ${file.hostPath}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }

    progressBar.update(index + 1, {
      bytes: formatBytes(summary.transferSize),
    });
  }
  const transmission: Tranmission = transmissionSummary_do(summary);
  progressBar.stop();

  summary.totalFiles = scanRecord.fileInfo.length;
  summary.duration = transmission.duration;
  summary.speed = transmission.speed;

  return summary;
}

async function download(options: TransferCLI): Promise<boolean> {
  const scanRecord: ScanRecord | null = await scan({
    silent: true,
    follow: true,
    hostpath: options.hostpath,
  });
  if (!scanRecord) {
    return false;
  }
  const progressBar: cliProgress.SingleBar =
    progressBar_setupAndStart(scanRecord);
  const summary = await chris_pull(scanRecord, progressBar);
  displayTable(createSummaryTable(summary), ["Metric", "Value"], {
    title: { title: "Download summary", justification: "center" },
  });

  return summary.failedCount === 0;
}

async function upload(options: TransferCLI): Promise<boolean> {
  const scanRecord: ScanRecord | null = await localFS_scan(options);
  if (!scanRecord) {
    return false;
  }
  const progressBar: cliProgress.SingleBar =
    progressBar_setupAndStart(scanRecord);
  const summary = await chris_push(scanRecord, progressBar);
  displayTable(createSummaryTable(summary), ["Metric", "Value"], {
    title: { title: "Upload summary", justification: "center" },
  });

  return summary.failedCount === 0;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export async function setupPathCommand(program: Command): Promise<void> {
  const pathCommand: Command = program
    .command("path")
    .description("Perform operations on ChRIS paths");

  pathCommand
    .command("upload <hostpath>")
    .description(
      "upload the <hostpath> from your computer into the current ChRIS folder context"
    )
    .action(async (hostpath: string) => {
      const result: boolean = await upload({ hostpath });
    });

  pathCommand
    .command("download [hostpath]")
    .description(
      "download the current ChRIS folder context to current dir or [hostdir]"
    )
    .action(async (hostpath: string) => {
      const result: boolean = await download({
        hostpath: hostpath || process.cwd(),
      });
      console.log(result);
    });

  pathCommand
    .command("scan")
    .description(
      "scan and list all files recursively from the current ChRIS folder context"
    )
    .option("--tree", "present in a style reminiscent of the UNIX tree command")
    .option("--follow", "follow chrislinks")
    .action(async (options: CLIscan) => {
      await scan(options);
    });
}
