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

interface UploadCLI {
  hostpath: string;
  // chrisdir: string;
}

interface DownloadCLI {
  hostdir: string;
  chrisdir: string;
}

interface FileInfo {
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

interface UploadSummary {
  startTime: number;
  endTime: number;
  totalFiles: number;
  uploadedCount: number;
  failedCount: number;
  uploadedSize: number;
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

interface CLItree {
  draw?: boolean;
  follow?: boolean;
}

function createSummaryTable(summary: UploadSummary): string[][] {
  const summaryTable: string[][] = [
    ["Total files", summary.totalFiles.toString()],
    ["Successfully uploaded", chalk.green(summary.uploadedCount.toString())],
    ["Failed to upload", chalk.red(summary.failedCount.toString())],
    [
      "Total data uploaded",
      chalk.blueBright(formatBytes(summary.uploadedSize)),
    ],
    [
      "Average upload speed",
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

async function resolveSymlink(
  link: FileInfo,
  followLinks: boolean
): Promise<FileInfo[]> {
  if (!followLinks || !link.linkTarget) {
    return [link];
  }

  const resolvedFiles: FileInfo[] = [];

  async function walkTarget(
    currentPath: string,
    basePath: string
  ): Promise<void> {
    const resourceGroups = await createResourceGroups(currentPath);
    if (!resourceGroups) {
      console.warn(`Failed to create resource groups for path: ${currentPath}`);
      return;
    }

    const { filesGroup, dirsGroup, linksGroup } = resourceGroups;

    // Process files
    const fileResults = await filesGroup.asset.resources_listAndFilterByOptions(
      optionsToParams({ fields: "fname,fsize" })
    );
    if (fileResults && fileResults.tableData) {
      for (const file of fileResults.tableData) {
        file.fname = "/" + file.fname;
        const size = parseInt(file.fsize, 10);
        const relativePath = path.relative(currentPath, file.fname);
        resolvedFiles.push({
          hostPath: path.join(currentPath, file.fname),
          chrisPath: path.join(basePath, relativePath),
          size: isNaN(size) ? 0 : size,
          isLink: false,
          linkTarget: "",
        });
      }
    }

    // Process links (recursive call to resolveSymlink)
    const linkResults = await linksGroup.asset.resources_listAndFilterByOptions(
      optionsToParams({ fields: "path,fname" })
    );
    if (linkResults && linkResults.tableData) {
      for (const subLink of linkResults.tableData) {
        subLink.fname = "/" + subLink.fname;
        subLink.path = "/" + subLink.path;
        const relativePath = path.relative(currentPath, subLink.fname);
        const subLinkInfo: FileInfo = {
          hostPath: subLink.path,
          chrisPath: path.join(basePath, relativePath),
          isLink: true,
          linkTarget: subLink.path,
          size: 0,
        };
        const resolvedSubLinks = await resolveSymlink(subLinkInfo, true);
        resolvedFiles.push(...resolvedSubLinks);
      }
    }

    // Process directories
    const dirResults = await dirsGroup.asset.resources_listAndFilterByOptions(
      optionsToParams({ fields: "path" })
    );
    if (dirResults && dirResults.tableData) {
      for (const dir of dirResults.tableData) {
        dir.path = "/" + dir.path;
        const relativePath = path.relative(currentPath, dir.path);
        await walkTarget(dir.path, path.join(basePath, relativePath));
      }
    }
  }

  try {
    await walkTarget(link.linkTarget, link.chrisPath || "");
  } catch (error) {
    console.error(`Error while resolving symlink: ${error}`);
    return [link]; // Return original link if resolution fails
  }

  return resolvedFiles.length > 0 ? resolvedFiles : [link];
}

function createArchyTree(files: FileInfo[]): string {
  interface ArchyNode {
    label: string;
    nodes: { [key: string]: ArchyNode };
  }

  const root: ArchyNode = { label: "home", nodes: {} };

  files.forEach((file: FileInfo) => {
    if (file.chrisPath) {
      const parts: string[] = file.chrisPath.split("/");
      let current: ArchyNode = root;
      parts.forEach((part: string, index: number) => {
        if (index === 0) return; // Skip 'home'
        if (!current.nodes[part]) {
          current.nodes[part] = { label: part, nodes: {} };
        }
        current = current.nodes[part];
      });
      if (file.isLink && file.linkTarget) {
        current.label += ` -> ${file.linkTarget}`;
      }
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
  followLinks: boolean = false
): Promise<ScanRecord | null> {
  const files: FileInfo[] = [];
  let totalSize = 0;

  async function walkChrisDir(
    currentPath: string,
    originalPath: string
  ): Promise<void> {
    const resourceGroups = await createResourceGroups(currentPath);
    if (!resourceGroups) return;

    const { filesGroup, dirsGroup, linksGroup } = resourceGroups;

    // Process files
    const fileResults = await filesGroup.asset.resources_listAndFilterByOptions(
      optionsToParams({ fields: "fname,fsize" })
    );
    if (fileResults && fileResults.tableData) {
      for (const file of fileResults.tableData) {
        const size = parseInt(file.fsize, 10);
        file.fname = "/" + file.fname;
        const relativePath = path.relative(currentPath, file.fname);
        const fileInfo: FileInfo = {
          hostPath: "",
          chrisPath: path.join(originalPath, relativePath),
          size: isNaN(size) ? 0 : size,
          isLink: false,
          linkTarget: "",
        };
        files.push(fileInfo);
        totalSize += fileInfo.size;
      }
    }

    // Process links
    const linkResults = await linksGroup.asset.resources_listAndFilterByOptions(
      optionsToParams({ fields: "path,fname" })
    );
    if (linkResults && linkResults.tableData) {
      for (const link of linkResults.tableData) {
        link.path = "/" + link.path;
        link.fname = "/" + link.fname;
        const linkInfo: FileInfo = {
          hostPath: "",
          chrisPath: path.join(originalPath, path.basename(link.fname)),
          isLink: true,
          linkTarget: link.path,
          size: 0,
        };
        if (followLinks) {
          const resolvedFiles = await resolveSymlink(linkInfo, followLinks);
          for (const resolvedFile of resolvedFiles) {
            resolvedFile.chrisPath = path.join(
              originalPath,
              path.relative(link.path, resolvedFile.chrisPath)
            );
            files.push(resolvedFile);
            if (resolvedFile.size) totalSize += resolvedFile.size;
          }
        } else {
          files.push(linkInfo);
        }
      }
    }

    // Process directories
    const dirResults = await dirsGroup.asset.resources_listAndFilterByOptions(
      optionsToParams({ fields: "path" })
    );
    if (dirResults && dirResults.tableData) {
      for (const dir of dirResults.tableData) {
        dir.path = "/" + dir.path;
        const relativePath = path.relative(currentPath, dir.path);
        await walkChrisDir(dir.path, path.join(originalPath, relativePath));
      }
    }
  }

  try {
    await walkChrisDir(chrisPath, chrisPath);
    return { fileInfo: files, totalSize };
  } catch (error) {
    errorStack.push("error", `Failed to scan ChRIS filesystem: ${error}`);
    return null;
  }
}

async function tree(options: CLItree): Promise<void> {
  const chrisFolder = chrisContext.getCurrent("folder");
  if (!chrisFolder) {
    console.error(
      chalk.red("No ChRIS folder context set. Use 'folder=' to set a context.")
    );
    return;
  }

  console.log(chalk.cyan(`Listing files recursively from ${chrisFolder}`));

  const scanResult = await chrisFS_scan(chrisFolder, options.follow);

  if (!scanResult) {
    console.error(chalk.red("Failed to scan ChRIS filesystem."));
    return;
  }

  if (options.draw) {
    console.log(createArchyTree(scanResult.fileInfo));
  } else {
    scanResult.fileInfo.forEach((file) => {
      if (file.isLink && !options.follow) {
        console.log(`${file.chrisPath} -> ${file.linkTarget}`);
      } else {
        console.log(file.chrisPath);
      }
    });
  }
  console.log(chalk.green(`Total size: ${formatBytes(scanResult.totalSize)}`));
}

async function getFilesToUpload(
  hostpath: string,
  chrisdir: string
): Promise<FileInfo[]> {
  const files: FileInfo[] = [];

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

async function localFS_scan(options: UploadCLI): Promise<ScanRecord | null> {
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
        "Uploading [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} files | {bytes}/{totalBytes}",
    },
    cliProgress.Presets.shades_classic
  );
  progressBar.start(scanRecord.fileInfo.length, 0, {
    bytes: "0 B",
    totalBytes: formatBytes(scanRecord.totalSize),
  });
  return progressBar;
}

function uploadSummary_init(): UploadSummary {
  const uploadSummary: UploadSummary = {
    startTime: 0 as number,
    endTime: 0 as number,
    totalFiles: 0 as number,
    uploadedCount: 0 as number,
    failedCount: 0 as number,
    uploadedSize: 0 as number,
    speed: 0 as number,
    duration: 0 as number,
  };
  return uploadSummary;
}

function transmissionSummary_do(upload: UploadSummary): Tranmission {
  let transmission: Tranmission = {
    duration: 0,
    speed: 0,
  };
  upload.endTime = Date.now();
  transmission.duration = (upload.endTime - upload.startTime) / 1000; // in seconds
  transmission.speed = upload.uploadedSize / transmission.duration; // bytes per second
  return transmission;
}

async function chris_push(
  scanRecord: ScanRecord,
  progressBar: cliProgress.SingleBar
): Promise<UploadSummary> {
  let summary: UploadSummary = uploadSummary_init();
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
        summary.uploadedCount++;
        summary.uploadedSize += fileContent.length;
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
      bytes: formatBytes(summary.uploadedSize),
    });
  }
  const transmission: Tranmission = transmissionSummary_do(summary);
  progressBar.stop();

  summary.totalFiles = scanRecord.fileInfo.length;
  summary.duration = transmission.duration;
  summary.speed = transmission.speed;

  return summary;
}

async function upload(options: UploadCLI): Promise<boolean> {
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
async function download(options: DownloadCLI): Promise<boolean> {
  // Implementation for download...
  return true;
}

export async function setupHostCommand(program: Command): Promise<void> {
  const hostCommand: Command = program
    .command("host")
    .description("Upload/download data to/from ChRIS");

  hostCommand
    .command("upload <hostpath>")
    .description("upload the <hostpath> into the current folder context")
    .action(async (hostpath: string, chrisdir: string) => {
      const result: boolean = await upload({ hostpath });
    });

  hostCommand
    .command("download <chrisdir> [hostdir]")
    .description("download <chrisdir> to current dir or [hostdir]")
    .action(async (chrisdir: string, hostdir: string) => {
      const result: boolean = await download({ hostdir, chrisdir });
      console.log(result);
    });

  hostCommand
    .command("tree")
    .description(
      "list all files recursively from the current ChRIS folder context"
    )
    .option("--draw", "present in a style reminiscent of the UNIX tree command")
    .option("--follow", "follow chrislinks")
    .action(async (options: CLItree) => {
      await tree(options);
    });
}
