import { Command } from "commander";
import { chrisIO, ChrisIO } from "@fnndsc/cumin";
import chalk from "chalk";
import Table from "cli-table3";
import fs from "fs";
import path from "path";
import cliProgress from "cli-progress";

interface UploadCLI {
  hostpath: string;
  chrisdir: string;
}

interface DownloadCLI {
  hostdir: string;
  chrisdir: string;
}

interface FileInfo {
  hostPath: string;
  chrisPath: string;
}

interface UploadSummary {
  totalFiles: number;
  uploadedCount: number;
  failedCount: number;
  uploadedSize: number;
  speed: number;
  duration: number;
}

function createSummaryTable(summary: UploadSummary): string {
  const summaryTable = new Table({
    head: [chalk.cyan("Metric"), chalk.cyan("Value")],
    colWidths: [30, 20],
  });

  summaryTable.push(
    ["Total files", summary.totalFiles.toString()],
    ["Successfully uploaded", chalk.green(summary.uploadedCount.toString())],
    ["Failed to upload", chalk.red(summary.failedCount.toString())],
    ["Total data uploaded", chalk.blue(formatBytes(summary.uploadedSize))],
    ["Average upload speed", chalk.blue(`${formatBytes(summary.speed)}/s`)],
    ["Duration", `${summary.duration.toFixed(2)} seconds`]
  );

  return summaryTable.toString();
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

async function upload(options: UploadCLI): Promise<boolean> {
  chrisIO.chrisFolder = options.chrisdir;
  const initOK: boolean | null = await chrisIO.initialize();
  if (!initOK) {
    console.log(chalk.red("Failed to initialize ChRIS folder."));
    return false;
  }

  console.log(chalk.blue("Scanning files to upload..."));
  const filesToUpload: FileInfo[] = await getFilesToUpload(
    options.hostpath,
    options.chrisdir
  );

  let totalSize: number = 0;
  for (const file of filesToUpload) {
    const stats: fs.Stats = await fs.promises.stat(file.hostPath);
    totalSize += stats.size;
  }

  const progressBar: cliProgress.SingleBar = new cliProgress.SingleBar(
    {
      format:
        "Uploading [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} files | {bytes}/{totalBytes}",
    },
    cliProgress.Presets.shades_classic
  );
  progressBar.start(filesToUpload.length, 0, {
    bytes: "0 B",
    totalBytes: formatBytes(totalSize),
  });

  let uploadedCount: number = 0;
  let failedCount: number = 0;
  let uploadedSize: number = 0;
  const startTime: number = Date.now();

  for (const [index, file] of filesToUpload.entries()) {
    try {
      const fileContent: Buffer = await fs.promises.readFile(file.hostPath);
      const fileBlob: Blob = new Blob([fileContent]);
      const uploadResult: boolean = await chrisIO.file_upload(
        fileBlob,
        file.chrisPath
      );

      if (uploadResult) {
        uploadedCount++;
        uploadedSize += fileContent.length;
      } else {
        failedCount++;
        console.log(chalk.yellow(`Failed to upload: ${file.hostPath}`));
      }
    } catch (error: unknown) {
      failedCount++;
      console.log(
        chalk.red(
          `Error uploading ${file.hostPath}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }

    progressBar.update(index + 1, {
      bytes: formatBytes(uploadedSize),
    });
  }

  progressBar.stop();

  const endTime: number = Date.now();
  const duration: number = (endTime - startTime) / 1000; // in seconds
  const speed: number = uploadedSize / duration; // bytes per second

  const summary: UploadSummary = {
    totalFiles: filesToUpload.length,
    uploadedCount,
    failedCount,
    uploadedSize,
    speed,
    duration,
  };

  console.log(chalk.green("\nUpload Summary:"));
  console.log(createSummaryTable(summary));

  return failedCount === 0;
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
    .command("upload <hostpath> <chrisdir>")
    .description("upload the <hostpath> into <chrisdir>")
    .action(async (hostpath: string, chrisdir: string) => {
      const result: boolean = await upload({ hostpath, chrisdir });
    });

  hostCommand
    .command("download <chrisdir> [hostdir]")
    .description("download <chrisdir> to current dir or [hostdir]")
    .action(async (chrisdir: string, hostdir: string) => {
      const result: boolean = await download({ hostdir, chrisdir });
      console.log(result);
    });
}
