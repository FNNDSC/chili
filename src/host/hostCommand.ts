import { Command } from "commander";
import { chrisIO, ChrisIO, chrisContext, errorStack } from "@fnndsc/cumin";
import chalk from "chalk";
import Table from "cli-table3";
import fs from "fs";
import path from "path";
import cliProgress from "cli-progress";
import { displayTable, TableOptions, drawBorder } from "../screen/screen.js";
import { error } from "console";

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
        files.push({ hostPath: hostFilePath, chrisPath: chrisFilePath });
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
    const stats: fs.Stats = await fs.promises.stat(file.hostPath);
    totalSize += stats.size;
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
    startTime: 0,
    endTime: 0,
    totalFiles: 0,
    uploadedCount: 0,
    failedCount: 0,
    uploadedSize: 0,
    speed: 0,
    duration: 0,
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
    .command("upload <chrisdir>")
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
}
