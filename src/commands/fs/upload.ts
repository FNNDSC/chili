/**
 * @file Upload command implementation.
 * @module
 */
import { files_uploadPath } from "@fnndsc/salsa";
import { chrisIO } from "@fnndsc/cumin";
import { path_resolveChrisFs } from "../../utils/cli.js";
import fs from "fs";
import path from "path";
import cliProgress from "cli-progress";
import chalk from "chalk";
import { prompt_confirmOrThrow } from "../../utils/input_format.js";

/**
 * File information for upload tracking.
 */
export interface UploadFileInfo {
  hostPath: string;
  chrisPath: string;
  size: number;
}

/**
 * Upload summary statistics.
 */
export interface UploadSummary {
  startTime: number;
  endTime: number;
  totalFiles: number;
  transferredCount: number;
  failedCount: number;
  transferSize: number;
  duration: number;
  speed: number;
  actualTargetPath: string; // The actual path where files were uploaded
}

/**
 * Formats bytes into human-readable format.
 * @param bytes - Number of bytes.
 * @returns Formatted string (e.g., "1.23 MB").
 */
export function bytes_format(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Formats seconds into a human-friendly ETA string.
 * @param seconds - Remaining seconds.
 */
export function eta_format(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "--";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

/**
 * Formats a bytes-per-second rate into human-readable string.
 * @param rateBytesPerSec - Rate in bytes per second.
 */
export function rate_format(rateBytesPerSec: number): string {
  if (!Number.isFinite(rateBytesPerSec) || rateBytesPerSec <= 0) return "--";
  return `${bytes_format(rateBytesPerSec)}/s`;
}

/**
 * Recursively scans a local directory to get all files for upload.
 * @param localPath - The local filesystem path.
 * @param remotePath - The target ChRIS path.
 * @returns Array of UploadFileInfo objects.
 */
async function scanLocalFiles(localPath: string, remotePath: string): Promise<UploadFileInfo[]> {
  const files: UploadFileInfo[] = [];

  async function walkDir(currentLocal: string, currentRemote: string): Promise<void> {
    const entries = await fs.promises.readdir(currentLocal, { withFileTypes: true });

    for (const entry of entries) {
      const localFilePath = path.join(currentLocal, entry.name);
      const remoteFilePath = currentRemote.endsWith('/')
        ? currentRemote + entry.name
        : currentRemote + '/' + entry.name;

      if (entry.isDirectory()) {
        await walkDir(localFilePath, remoteFilePath);
      } else {
        const stats = await fs.promises.stat(localFilePath);
        files.push({
          hostPath: localFilePath,
          chrisPath: remoteFilePath,
          size: stats.size,
        });
      }
    }
  }

  // Check if localPath is a directory or file
  const stats = await fs.promises.stat(localPath);
  if (stats.isDirectory()) {
    // Preserve directory basename in remote path (Unix cp semantics)
    const basename = path.basename(localPath);
    const targetDir = remotePath.endsWith('/')
      ? remotePath + basename
      : remotePath + '/' + basename;
    await walkDir(localPath, targetDir);
  } else {
    // Single file upload
    const filename = path.basename(localPath);
    const targetPath = remotePath.endsWith('/')
      ? remotePath + filename
      : remotePath + '/' + filename;
    files.push({
      hostPath: localPath,
      chrisPath: targetPath,
      size: stats.size,
    });
  }

  return files;
}

/**
 * Uploads files with a progress bar display.
 * @param localPath - Local path (file or directory).
 * @param remotePath - Remote ChRIS path.
 * @returns Promise<UploadSummary> with upload statistics.
 */
export async function files_uploadWithProgress(
  localPath: string,
  remotePath: string,
  options: { force?: boolean } = {}
): Promise<UploadSummary> {
  // Resolve remote path
  const resolvedRemote: string = await path_resolveChrisFs(remotePath, {});

  // Scan files
  console.log(chalk.cyan("Scanning files to upload..."));
  const fileList: UploadFileInfo[] = await scanLocalFiles(localPath, resolvedRemote);

  const totalSize: number = fileList.reduce(
    (sum: number, f: UploadFileInfo) => sum + f.size,
    0
  );

  // Determine actual target path (where files will be uploaded)
  const stats: fs.Stats = await fs.promises.stat(localPath);
  let actualTarget: string = resolvedRemote;
  if (stats.isDirectory()) {
    const basename: string = path.basename(localPath);
    actualTarget = resolvedRemote.endsWith('/')
      ? resolvedRemote + basename
      : resolvedRemote + '/' + basename;
  }

  // Detect existing target and require confirmation unless force is set
  if (!options.force) {
    try {
      const client = await chrisIO.client_get();
      if (client) {
        const folderList = await client.getFileBrowserFolders({ path: actualTarget });
        const items = await folderList.getItems();
        if (items.length > 0) {
          await prompt_confirmOrThrow(`Target '${actualTarget}' already exists in ChRIS. Merge/overwrite? (y/N)`);
        }
      }
    } catch {
      // If listing fails (path absent or error), continue.
    }
  } else {
    // Force mode: if target exists and is a directory, no prompt. If it's a file and we're uploading a single file, proceed.
  }

  // Setup progress bar
  const showProgress: boolean = !!process.stdout.isTTY;
  const progressBar = showProgress
    ? new cliProgress.SingleBar(
        {
          format:
            "Transferring [{bar}] {percentage}% | ETA: {etaHuman} | Rate: {rate} | {value}/{total} files | {bytes}/{totalBytes}",
        },
        cliProgress.Presets.shades_classic
      )
    : null;

  if (progressBar) {
    progressBar.start(fileList.length, 0, {
      bytes: "0 B",
      totalBytes: bytes_format(totalSize),
      etaHuman: "--",
      rate: "--",
    });
  }

  // Upload files
  const summary: UploadSummary = {
    startTime: Date.now(),
    endTime: 0,
    totalFiles: fileList.length,
    transferredCount: 0,
    failedCount: 0,
    transferSize: 0,
    duration: 0,
    speed: 0,
    actualTargetPath: actualTarget,
  };

  for (const [index, file] of fileList.entries()) {
    try {
      const fileContent = await fs.promises.readFile(file.hostPath);
      const fileBlob = new Blob([fileContent as any]);

      // Split chrisPath into dir and filename for the new API
      const lastSlash = file.chrisPath.lastIndexOf('/');
      const dir = file.chrisPath.substring(0, lastSlash) || '/';
      const filename = file.chrisPath.substring(lastSlash + 1);

      const uploadResult = await chrisIO.file_upload(fileBlob, dir, filename);

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

    const elapsedSeconds: number = Math.max(1e-6, (Date.now() - summary.startTime) / 1000);
    const rateCurrent: number =
      summary.transferSize > 0 ? summary.transferSize / elapsedSeconds : 0;
    const remainingBytes: number = Math.max(0, totalSize - summary.transferSize);
    const etaSeconds: number | null = rateCurrent > 0 ? remainingBytes / rateCurrent : null;

    if (progressBar) {
      progressBar.update(index + 1, {
        bytes: bytes_format(summary.transferSize),
        etaHuman: eta_format(etaSeconds),
        rate: rate_format(rateCurrent),
      });
    }
  }

  if (progressBar) {
    progressBar.stop();
  }

  summary.endTime = Date.now();
  summary.duration = (summary.endTime - summary.startTime) / 1000; // seconds
  summary.speed = summary.transferSize / summary.duration; // bytes per second

  return summary;
}

/**
 * Uploads a local file or directory to ChRIS.
 *
 * @param localPath - Local path.
 * @param remotePath - Remote ChRIS path.
 * @returns Promise<boolean> true if successful.
 */
export async function files_upload(localPath: string, remotePath: string): Promise<boolean> {
  // Resolve remote path context relative to current ChRIS CWD
  const resolvedRemote: string = await path_resolveChrisFs(remotePath, {});

  return await files_uploadPath(localPath, resolvedRemote);
}
