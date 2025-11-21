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
import open from "open";
import { exec } from "child_process";
import os from "os";

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
  isDirectory: boolean;
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
  dirsOnly?: boolean;
  filter?: string;
  endsWith?: string;
  mermaid?: boolean;
  save?: string;
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

function generateMermaidDefinition(scanResult: ScanRecord): string {
  let definition = "graph TD\n";
  definition += "    %% Styles\n";
  definition +=
    "    classDef default fill:#f9f,stroke:#333,stroke-width:2px;\n";
  definition += "    classDef root fill:#ff9,stroke:#333,stroke-width:4px;\n";
  definition += "    classDef leaf fill:#9f9,stroke:#333,stroke-width:2px;\n\n";

  const nodes = new Map<string, number>();
  const edges = new Set<string>();
  let nodeCounter = 0;

  function getOrCreateNodeId(path: string): number {
    if (!nodes.has(path)) {
      nodes.set(path, nodeCounter++);
    }
    return nodes.get(path)!;
  }

  const leafNodes = new Set<number>();

  scanResult.fileInfo.forEach((file) => {
    const parts = file.chrisPath.split("/").filter(Boolean);
    for (let i = 1; i < parts.length; i++) {
      const parentPath = "/" + parts.slice(0, i).join("/");
      const currentPath = "/" + parts.slice(0, i + 1).join("/");

      const parentNode = getOrCreateNodeId(parentPath);
      const currentNode = getOrCreateNodeId(currentPath);

      const edge = `${parentNode} --> ${currentNode}`;
      if (!edges.has(edge)) {
        edges.add(edge);
        definition += `    ${parentNode}[${parts[i - 1]}] --> ${currentNode}[${
          parts[i]
        }]\n`;
      }

      if (i === parts.length - 1) {
        leafNodes.add(currentNode);
      }
    }
  });

  // Apply styles
  definition += "\n    %% Applying styles\n";
  definition += `    class ${getOrCreateNodeId("/")} root;\n`;
  leafNodes.forEach((nodeId) => {
    definition += `    class ${nodeId} leaf;\n`;
  });

  return definition;
}

function generateMermaidHtml(mermaidDefinition: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Plugin DAG</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
</head>
<body>
    <div class="mermaid">
    ${mermaidDefinition}
    </div>
    <script>
        mermaid.initialize({ startOnLoad: true });
    </script>
</body>
</html>
  `;
}

async function renderMermaidInBrowser(mermaidDefinition: string) {
  const html = generateMermaidHtml(mermaidDefinition);
  const tempDir = os.tmpdir();
  const filePath = path.join(tempDir, "mermaid-diagram.html");
  fs.writeFileSync(filePath, html);
  await open(filePath);
}

async function renderMermaidServerSide(
  mermaidDefinition: string,
  outputFile: string
): Promise<string> {
  const tempDir = os.tmpdir();
  const inputFile = path.join(tempDir, "input.mmd");

  fs.writeFileSync(inputFile, mermaidDefinition);

  return new Promise((resolve, reject) => {
    exec(
      `npx mmdc -i ${inputFile} -o ${outputFile}`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          reject(error);
          return;
        }
        resolve(outputFile);
      }
    );
  });
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

async function dirs_scan(
  dirsGroup: ChRISEmbeddedResourceGroup<FileBrowserFolder>,
  chrisPath: string,
  hostBasePath: string,
  linkedPath: string = ""
): Promise<FileInfo[]> {
  const dirs: FileInfo[] = [];
  const dirResults: FilteredResourceData | void =
    await dirsGroup.asset.resources_listAndFilterByOptions(
      optionsToParams({ fields: "path" })
    );
  if (dirResults && dirResults.tableData) {
    for (const dir of dirResults.tableData) {
      dir.path = "/" + dir.path;
      const relativeChrisPath: string = linkedPath
        ? path.join(linkedPath, path.basename(dir.path))
        : dir.path;
      const dirInfo: FileInfo = {
        id: 0,
        hostPath: path.join(
          hostBasePath,
          path.relative(chrisPath, relativeChrisPath)
        ),
        chrisPath: relativeChrisPath,
        size: 0,
        isLink: false,
        linkTarget: "",
        isDirectory: true,
      };
      dirs.push(dirInfo);
    }
  }
  return dirs;
}

async function files_scan(
  filesGroup: ChRISEmbeddedResourceGroup<FileBrowserFolder>,
  chrisPath: string,
  hostBasePath: string,
  linkedPath: string = ""
): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
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
        isDirectory: false,
      };
      files.push(fileInfo);
    }
  }
  return files;
}

async function links_scan(
  linksGroup: ChRISEmbeddedResourceGroup<FileBrowserFolder>,
  chrisPath: string,
  hostBasePath: string,
  linkedPath: string = ""
): Promise<FileInfo[]> {
  const links: FileInfo[] = [];
  const linkResults: FilteredResourceData | void =
    await linksGroup.asset.resources_listAndFilterByOptions(
      optionsToParams({ fields: "id,path,fname" })
    );
  if (linkResults && linkResults.tableData) {
    for (const link of linkResults.tableData) {
      link.path = "/" + link.path;
      link.fname = "/" + link.fname;
      const relativeChrisPath: string = linkedPath
        ? path.join(linkedPath, path.basename(link.fname))
        : link.fname;
      const linkInfo: FileInfo = {
        id: parseInt(link.id, 10),
        hostPath: path.join(
          hostBasePath,
          path.relative(chrisPath, relativeChrisPath)
        ),
        chrisPath: relativeChrisPath,
        isLink: true,
        linkTarget: link.path,
        size: 0,
        isDirectory: false,
      };
      links.push(linkInfo);
    }
  }
  return links;
}

async function chrisFS_scan(
  chrisPath: string,
  hostBasePath: string,
  followLinks: boolean = false,
  dirsOnly: boolean = false
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

    const dirInfos = await dirs_scan(
      dirsGroup,
      chrisPath,
      hostBasePath,
      linkedPath
    );
    files.push(...dirInfos);

    if (!dirsOnly) {
      const fileInfos = await files_scan(
        filesGroup,
        chrisPath,
        hostBasePath,
        linkedPath
      );
      files.push(...fileInfos);
      totalSize += fileInfos.reduce((sum, file) => sum + file.size, 0);

      const linkInfos = await links_scan(
        linksGroup,
        chrisPath,
        hostBasePath,
        linkedPath
      );
      files.push(...linkInfos);

      if (followLinks) {
        for (const link of linkInfos) {
          await walkChrisDir(link.linkTarget, link.chrisPath);
        }
      }
    }

    for (const dir of dirInfos) {
      await walkChrisDir(
        dir.chrisPath,
        linkedPath ? path.join(linkedPath, path.basename(dir.chrisPath)) : ""
      );
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
      chalk.cyan(
        `Scanning for ${
          options.dirsOnly ? "directories" : "all files"
        } recursively from ${chrisFolder}`
      )
    );
  }
  const hostBasePath: string = options.hostpath || process.cwd();
  let scanResult: ScanRecord | null = await chrisFS_scan(
    chrisFolder,
    hostBasePath,
    options.follow,
    options.dirsOnly
  );
  if (!scanResult) {
    console.error(chalk.red("Failed to scan ChRIS filesystem."));
    return null;
  }

  // Apply filters if specified
  if (options.filter || options.endsWith) {
    const keepPaths = new Set<string>();
    scanResult.fileInfo.forEach((file) => {
      const basename = path.basename(file.chrisPath);
      if (
        (!options.filter || file.chrisPath.includes(options.filter)) &&
        (!options.endsWith || basename.includes(options.endsWith))
      ) {
        // Keep this file and all its parent directories
        let currentPath = file.chrisPath;
        while (currentPath !== "/") {
          keepPaths.add(currentPath);
          currentPath = path.dirname(currentPath);
        }
        keepPaths.add("/"); // Ensure root is always included
      }
    });

    const filteredFileInfo = scanResult.fileInfo.filter((file) =>
      keepPaths.has(file.chrisPath)
    );
    const filteredTotalSize = filteredFileInfo.reduce(
      (sum, file) => sum + file.size,
      0
    );
    scanResult = {
      fileInfo: filteredFileInfo,
      totalSize: filteredTotalSize,
    };
  }

  if (options.mermaid) {
    const mermaidDefinition = generateMermaidDefinition(scanResult);
    if (options.save) {
      try {
        const outputFile = path.resolve(options.save);
        const savedFilePath = await renderMermaidServerSide(
          mermaidDefinition,
          outputFile
        );
        console.log(`Mermaid diagram saved to: ${savedFilePath}`);
      } catch (error) {
        console.error(`Failed to save Mermaid diagram: ${error}`);
      }
    } else {
      await renderMermaidInBrowser(mermaidDefinition);
    }
  } else {
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
  }

  if (!options.silent) {
    console.log(
      chalk.green(`Total size: ${formatBytes(scanResult.totalSize)}`)
    );
    if (options.filter || options.endsWith) {
      console.log(
        chalk.cyan(`Filtered results: ${scanResult.fileInfo.length} items`)
      );
    }
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
          isDirectory: false,
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
      const fileBlob: Blob = new Blob([fileContent as any]);
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
    .option("--dirsOnly", "scan only directories")
    .option("--silent", "suppress output")
    .option("--hostpath <path>", "specify host path for file mapping")
    .option(
      "--filter <text>",
      "filter results to include only paths containing the specified text"
    )
    .option(
      "--endsWith <text>",
      "filter results to include only paths ending with the specified text"
    )
    .option("--mermaid", "render the result as a Mermaid.js diagram")
    .option(
      "--save <filename>",
      "save the Mermaid diagram to the specified file"
    )
    .action(async (options: CLIscan) => {
      await scan(options);
    });
}
