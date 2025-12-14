import { Command } from "commander";
import {
  chrisIO,
  ChrisIO,
  chrisContext,
  errorStack,
  ChRISEmbeddedResourceGroup,
  ListOptions,
  FilteredResourceData,
  objContext_create,
  ChrisPathNode,
} from "@fnndsc/cumin";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import cliProgress from "cli-progress";
import { table_display, border_draw, TableOptions } from "../screen/screen.js";
import { options_toParams } from "../utils/cli.js";
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

export interface ScanRecord {
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
  filesGroup: ChRISEmbeddedResourceGroup<ChrisPathNode>;
  dirsGroup: ChRISEmbeddedResourceGroup<ChrisPathNode>;
  linksGroup: ChRISEmbeddedResourceGroup<ChrisPathNode>;
}

export interface CLIscan {
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

/**
 * Creates a summary table for file transfer details.
 *
 * @param summary - The TransferDetail object containing transfer statistics.
 * @returns A 2D array representing the summary table.
 */
function summaryTable_create(summary: TransferDetail): string[][] {
  const summaryTable: string[][] = [
    ["Total files", summary.totalFiles.toString()],
    [
      "Successfully transferred",
      chalk.green(summary.transferredCount.toString()),
    ],
    ["Failed to transfer", chalk.red(summary.failedCount.toString())],
    [
      "Total data transferred",
      chalk.blueBright(bytes_format(summary.transferSize)),
    ],
    [
      "Average transfer speed",
      chalk.blueBright(`${bytes_format(summary.speed)}/s`),
    ],
    ["Duration", `${summary.duration.toFixed(2)} seconds`],
  ];

  return summaryTable;
}

/**
 * Creates resource groups (files, directories, links) for a given ChRIS path.
 *
 * @param currentPath - The ChRIS path to create resource groups for.
 * @returns A Promise resolving to an object containing the resource groups, or null on error.
 */
async function resourceGroups_create(
  currentPath: string
): Promise<ResourceGroups | null> {
  try {
    const filesGroup = (await objContext_create(
      "ChRISFilesContext",
      `folder:${currentPath}`
    )) as ChRISEmbeddedResourceGroup<ChrisPathNode>;
    const dirsGroup = (await objContext_create(
      "ChRISDirsContext",
      `folder:${currentPath}`
    )) as ChRISEmbeddedResourceGroup<ChrisPathNode>;
    const linksGroup = (await objContext_create(
      "ChRISLinksContext",
      `folder:${currentPath}`
    )) as ChRISEmbeddedResourceGroup<ChrisPathNode>;

    return { filesGroup, dirsGroup, linksGroup };
  } catch (error) {
    errorStack.stack_push(
      "error",
      `Failed to create ChRISEmbeddedResourceGroup objects for path ${currentPath}: ${error}`
    );
    return null;
  }
}

/**
 * Generates a Mermaid diagram definition from a scan result.
 *
 * @param scanResult - The ScanRecord containing file information.
 * @returns The Mermaid diagram definition string.
 */
function mermaidDefinition_generate(scanResult: ScanRecord): string {
  let definition = "graph TD\n";
  definition += "    %% Styles\n";
  definition +=
    "    classDef default fill:#f9f,stroke:#333,stroke-width:2px;\n";
  definition += "    classDef root fill:#ff9,stroke:#333,stroke-width:4px;\n";
  definition += "    classDef leaf fill:#9f9,stroke:#333,stroke-width:2px;\n\n";

  const nodes = new Map<string, number>();
  const edges = new Set<string>();
  let nodeCounter = 0;

  function nodeId_getOrCreate(path: string): number {
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

      const parentNode = nodeId_getOrCreate(parentPath);
      const currentNode = nodeId_getOrCreate(currentPath);

      const edge = `${parentNode} --> ${currentNode}`;
      if (!edges.has(edge)) {
        edges.add(edge);
        definition += `    ${parentNode}[${parts[i - 1]}] --> ${currentNode}[${
          parts[i]
        }]
`;
      }

      if (i === parts.length - 1) {
        leafNodes.add(currentNode);
      }
    }
  });

  // Apply styles
  definition += "\n    %% Applying styles\n";
  definition += `    class ${nodeId_getOrCreate("/")} root;\n`;
  leafNodes.forEach((nodeId) => {
    definition += `    class ${nodeId} leaf;\n`;
  });

  return definition;
}

/**
 * Generates an HTML page for displaying a Mermaid diagram.
 *
 * @param mermaidDefinition - The Mermaid diagram definition string.
 * @returns The HTML content as a string.
 */
function mermaidHtml_generate(mermaidDefinition: string): string {
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

/**
 * Renders a Mermaid diagram in a browser window.
 *
 * @param mermaidDefinition - The Mermaid diagram definition string.
 */
async function mermaid_renderInBrowser(mermaidDefinition: string) {
  const html = mermaidHtml_generate(mermaidDefinition);
  const tempDir = os.tmpdir();
  const filePath = path.join(tempDir, "mermaid-diagram.html");
  fs.writeFileSync(filePath, html);
  await open(filePath);
}

/**
 * Renders a Mermaid diagram on the server-side and saves it to a file.
 * Requires `mmdc` (Mermaid CLI) to be installed.
 *
 * @param mermaidDefinition - The Mermaid diagram definition string.
 * @param outputFile - The path to save the output file.
 * @returns A Promise resolving to the output file path.
 */
async function mermaid_renderServerSide(
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

/**
 * Creates an Archy-formatted tree structure from file information.
 *
 * @param files - An array of FileInfo objects.
 * @returns The Archy-formatted tree string.
 */
export function archyTree_create(files: FileInfo[]): string {
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

  function archyFormat_convert(node: ArchyNode): archy.Data {
    return {
      label: node.label,
      nodes: Object.values(node.nodes).map(archyFormat_convert),
    };
  }

  return archy(archyFormat_convert(root));
}

/**
 * Scans directories within ChRIS.
 *
 * @param dirsGroup - The ChRISEmbeddedResourceGroup for directories.
 * @param chrisPath - The base ChRIS path.
 * @param hostBasePath - The base path on the host system.
 * @param linkedPath - Optional linked path for resolving relative paths.
 * @returns A Promise resolving to an array of FileInfo objects for directories.
 */
async function dirs_scan(
  dirsGroup: ChRISEmbeddedResourceGroup<ChrisPathNode>,
  chrisPath: string,
  hostBasePath: string,
  linkedPath: string = ""
): Promise<FileInfo[]> {
  const dirs: FileInfo[] = [];
  const dirResults: FilteredResourceData | null =
    await dirsGroup.asset.resources_listAndFilterByOptions(
      options_toParams({ fields: "path" })
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

/**
 * Scans files within ChRIS.
 *
 * @param filesGroup - The ChRISEmbeddedResourceGroup for files.
 * @param chrisPath - The base ChRIS path.
 * @param hostBasePath - The base path on the host system.
 * @param linkedPath - Optional linked path for resolving relative paths.
 * @returns A Promise resolving to an array of FileInfo objects for files.
 */
async function files_scan(
  filesGroup: ChRISEmbeddedResourceGroup<ChrisPathNode>,
  chrisPath: string,
  hostBasePath: string,
  linkedPath: string = ""
): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
  const fileResults: FilteredResourceData | null =
    await filesGroup.asset.resources_listAndFilterByOptions(
      options_toParams({ fields: "id,fname,fsize" })
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

/**
 * Scans links within ChRIS.
 *
 * @param linksGroup - The ChRISEmbeddedResourceGroup for links.
 * @param chrisPath - The base ChRIS path.
 * @param hostBasePath - The base path on the host system.
 * @param linkedPath - Optional linked path for resolving relative paths.
 * @returns A Promise resolving to an array of FileInfo objects for links.
 */
async function links_scan(
  linksGroup: ChRISEmbeddedResourceGroup<ChrisPathNode>,
  chrisPath: string,
  hostBasePath: string,
  linkedPath: string = ""
): Promise<FileInfo[]> {
  const links: FileInfo[] = [];
  const linkResults: FilteredResourceData | null =
    await linksGroup.asset.resources_listAndFilterByOptions(
      options_toParams({ fields: "id,path,fname" })
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

/**
 * Scans the ChRIS filesystem recursively.
 *
 * @param chrisPath - The starting ChRIS path for the scan.
 * @param hostBasePath - The base path on the host system for path mapping.
 * @param followLinks - If true, follow ChRIS links.
 * @param dirsOnly - If true, scan only directories.
 * @returns A Promise resolving to a ScanRecord, or null on error.
 */
async function chrisFS_scan(
  chrisPath: string,
  hostBasePath: string,
  followLinks: boolean = false,
  dirsOnly: boolean = false
): Promise<ScanRecord | null> {
  const files: FileInfo[] = [];
  let totalSize: number = 0;

  async function chrisDir_walk(
    currentPath: string,
    linkedPath: string = ""
  ): Promise<void> {
    const resourceGroups: ResourceGroups | null = await resourceGroups_create( // Renamed
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
          await chrisDir_walk(link.linkTarget, link.chrisPath);
        }
      }
    }

    for (const dir of dirInfos) {
      await chrisDir_walk(
        dir.chrisPath,
        linkedPath ? path.join(linkedPath, path.basename(dir.chrisPath)) : ""
      );
    }
  }

  try {
    await chrisDir_walk(chrisPath);
    return { fileInfo: files, totalSize };
  } catch (error) {
    errorStack.stack_push("error", `Failed to scan ChRIS filesystem: ${error}`);
    return null;
  }
}

/**
 * Initiates a scan of the ChRIS filesystem and presents the results.
 *
 * @param options - CLI options for the scan, including display format and filters.
 * @returns A Promise resolving to a ScanRecord, or null on error.
 */
export async function scan_do(options: CLIscan): Promise<ScanRecord | null> {
  const chrisFolder: string | null = await chrisContext.current_get(
    "folder" as any
  );
  if (!chrisFolder) {
    console.error(
      chalk.red("No ChRIS folder context set. Use 'folder=' to set a context.")
    );
    return null;
  }
  if (!options.silent) {
    console.log(
      chalk.cyan(
        `Scanning for ${options.dirsOnly ? "directories" : "all files"} recursively from ${chrisFolder}`
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
    const mermaidDefinition = mermaidDefinition_generate(scanResult);
    if (options.save) {
      try {
        const outputFile = path.resolve(options.save);
        const savedFilePath = await mermaid_renderServerSide(
          mermaidDefinition,
          outputFile
        );
        console.log(`Mermaid diagram saved to: ${savedFilePath}`);
      } catch (error) {
        console.error(`Failed to save Mermaid diagram: ${error}`);
      }
    } else {
      await mermaid_renderInBrowser(mermaidDefinition);
    }
  } else {
    if (options.tree) {
      console.log(archyTree_create(scanResult.fileInfo));
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
      chalk.green(`Total size: ${bytes_format(scanResult.totalSize)}`)
    );
    if (options.filter || options.endsWith) {
      console.log(
        chalk.cyan(`Filtered results: ${scanResult.fileInfo.length} items`)
      );
    }
  }
  return scanResult;
}

/**
 * Recursively gets files from the host path to be uploaded to ChRIS.
 *
 * @param hostpath - The host system path to scan.
 * @param chrisdir - The target ChRIS directory path.
 * @returns A Promise resolving to an array of FileInfo objects for files to upload.
 */
async function filesToUpload_get(
  hostpath: string,
  chrisdir: string
): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
  let idCounter: number = 1;

  async function dir_walk(
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
        await dir_walk(hostFilePath, chrisFilePath);
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

  // Preserve the basename of the source directory in the target path
  const hostBasename: string = path.basename(hostpath);
  await dir_walk(hostpath, path.join(chrisdir, hostBasename));
  return files;
}

/**
 * Scans the local filesystem for files to upload to ChRIS.
 *
 * @param options - TransferCLI options specifying the host path.
 * @returns A Promise resolving to a ScanRecord of local files, or null on error.
 */
async function localFS_scan(options: TransferCLI): Promise<ScanRecord | null> {
  await chrisContext.currentContext_update();
  const folder = chrisContext.singleContext.folder as any as string | undefined;
  if (!folder) {
    console.error("ChRIS folder context is undefined, cannot initialize chrisIO.");
    return null;
  }

  // Validate that the folder context exists in CUBE before proceeding
  try {
    const testGroup = await objContext_create("ChRISDirsContext", `folder:${folder}`);
    if (!testGroup) {
      console.error(chalk.red(`Folder context '${folder}' does not exist in CUBE. Please specify an existing directory.`));
      return null;
    }
  } catch (error) {
    console.error(chalk.red(`Folder context '${folder}' does not exist in CUBE. Please specify an existing directory.`));
    return null;
  }

  // Folder exists, so just set chrisFolder without calling init()
  // (init() tries to CREATE the folder which will fail if it already exists)
  chrisIO.chrisFolder = folder;

  console.log(border_draw(chalk.cyan("Scanning files to upload...")));
  const filesToUpload: FileInfo[] = await filesToUpload_get(
    options.hostpath,
    folder as string
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

/**
 * Sets up and starts a CLI progress bar for file transfers.
 *
 * @param scanRecord - The ScanRecord containing total files and size.
 * @returns The initialized cliProgress.SingleBar instance.
 */
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
    totalBytes: bytes_format(scanRecord.totalSize), // Renamed
  });
  return progressBar;
}

/**
 * Initializes a TransferDetail object.
 *
 * @returns An initialized TransferDetail object.
 */
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

/**
 * Calculates transmission summary details (duration and speed).
 *
 * @param transfer - The TransferDetail object to update.
 * @returns A Tranmission object with calculated speed and duration.
 */
function transmissionSummary_get(transfer: TransferDetail): Tranmission {
  let transmission: Tranmission = {
    duration: 0,
    speed: 0,
  };
  transfer.endTime = Date.now();
  transmission.duration = (transfer.endTime - transfer.startTime) / 1000; // in seconds
  transmission.speed = transfer.transferSize / transmission.duration; // bytes per second
  return transmission;
}

/**
 * Resolves the parent directory name for pulled files.
 *
 * @returns The parent directory name or an empty string.
 */
function pulledParentDir_resolve(): string {
  const chrisFolder: string | undefined = chrisContext.singleContext.folder as any as string | undefined;

  if (!chrisFolder) {
    return "";
  }
  if (chrisFolder.endsWith("/")) {
    return "";
  }
  return path.basename(chrisFolder);
}

/**
 * Pulls files from ChRIS to the local filesystem.
 *
 * @param scanRecord - The ScanRecord of files to pull.
 * @param progressBar - The CLI progress bar instance.
 * @returns A Promise resolving to a TransferDetail object with pull statistics.
 */
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
          `Error downloading ${file.hostPath}: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }

    progressBar.update(index + 1, {
      bytes: bytes_format(summary.transferSize), // Renamed
    });
  }

  const transmission: Tranmission = transmissionSummary_get(summary);
  progressBar.stop();

  summary.totalFiles = scanRecord.fileInfo.length;
  summary.duration = transmission.duration;
  summary.speed = transmission.speed;

  return summary;
}

/**
 * Pushes files from the local filesystem to ChRIS.
 *
 * @param scanRecord - The ScanRecord of files to push.
 * @param progressBar - The CLI progress bar instance.
 * @returns A Promise resolving to a TransferDetail object with push statistics.
 */
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
          `Error uploading ${file.hostPath}: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }

    progressBar.update(index + 1, {
      bytes: bytes_format(summary.transferSize), // Renamed
    });
  }
  const transmission: Tranmission = transmissionSummary_get(summary);
  progressBar.stop();

  summary.totalFiles = scanRecord.fileInfo.length;
  summary.duration = transmission.duration;
  summary.speed = transmission.speed;

  return summary;
}

/**
 * Downloads files from ChRIS to the local filesystem.
 *
 * @param options - TransferCLI options including host path.
 * @returns A Promise resolving to true if download was successful, false otherwise.
 */
async function download_handle(options: TransferCLI): Promise<boolean> { // Renamed
  const scanRecord: ScanRecord | null = await scan_do({
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
  table_display(summaryTable_create(summary), ["Metric", "Value"], { // Renamed
    title: { title: "Download summary", justification: "center" },
  });

  return summary.failedCount === 0;
}

/**
 * Uploads files from the local filesystem to ChRIS.
 *
 * @param options - TransferCLI options including host path.
 * @returns A Promise resolving to true if upload was successful, false otherwise.
 */
async function upload_handle(options: TransferCLI): Promise<boolean> { // Renamed
  const scanRecord: ScanRecord | null = await localFS_scan(options);
  if (!scanRecord) {
    return false;
  }
  const progressBar: cliProgress.SingleBar =
    progressBar_setupAndStart(scanRecord);
  const summary = await chris_push(scanRecord, progressBar);
  table_display(summaryTable_create(summary), ["Metric", "Value"], { // Renamed
    title: { title: "Upload summary", justification: "center" },
  });

  return summary.failedCount === 0;
}

/**
 * Formats a number of bytes into a human-readable string.
 *
 * @param bytes - The number of bytes.
 * @returns A formatted string (e.g., "1.23 MB").
 */
export function bytes_format(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Sets up the 'path' command for performing operations on ChRIS paths.
 *
 * @param program - The Commander.js program instance.
 */
export async function pathCommand_setup(program: Command): Promise<void> {
  const pathCommand: Command = program
    .command("path")
    .description("Perform operations on ChRIS paths");

  pathCommand
    .command("upload <hostpath>")
    .description(
      "upload the <hostpath> from your computer into the current ChRIS folder context"
    )
    .action(async (hostpath: string) => {
      const result: boolean = await upload_handle({ hostpath });
    });

  pathCommand
    .command("download [hostpath]")
    .description(
      "download the current ChRIS folder context to current dir or [hostdir]"
    )
    .action(async (hostpath: string) => {
      const result: boolean = await download_handle({
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
      await scan_do(options);
    });
}
