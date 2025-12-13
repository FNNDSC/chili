/**
 * @file Download command implementation.
 * @module
 */
import { fileContent_getBinary, files_listRecursive, FsItem } from "@fnndsc/salsa";
import { path_resolveChrisFs } from "../../utils/cli.js";
import fs from "fs";
import path from "path";
import cliProgress from "cli-progress";
import chalk from "chalk";
import { bytes_format } from "./upload.js";

/**
 * Download summary statistics.
 */
export interface DownloadSummary {
  startTime: number;
  endTime: number;
  totalFiles: number;
  transferredCount: number;
  failedCount: number;
  transferSize: number;
  duration: number;
  speed: number;
}

/**
 * Recursively creates a directory and all parent directories.
 * @param dirPath - Directory path to create.
 */
async function directory_ensureExists(dirPath: string): Promise<void> {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

/**
 * Checks if a ChRIS path is a directory by attempting to list it.
 * @param chrisPath - ChRIS path to check.
 * @returns True if it's a directory, false if it's a file.
 */
async function chrisPath_isDirectory(chrisPath: string): Promise<boolean> {
  try {
    // Try to list it - if it succeeds, it's a directory
    const items = await files_listRecursive(chrisPath);
    return items.length > 0 || chrisPath.endsWith('/');
  } catch {
    // If listing fails, assume it's a file
    return false;
  }
}

/**
 * Downloads files from ChRIS with a progress bar display.
 * @param chrisPath - Remote ChRIS path (file or directory).
 * @param localPath - Local filesystem path.
 * @param options - Download options.
 * @returns Promise<DownloadSummary> with download statistics.
 */
export async function files_downloadWithProgress(
  chrisPath: string,
  localPath: string,
  options: { force?: boolean } = {}
): Promise<DownloadSummary> {
  // Resolve ChRIS path
  const resolvedChris = await path_resolveChrisFs(chrisPath, {});

  // Check if local path exists (unless force flag)
  if (!options.force && fs.existsSync(localPath)) {
    throw new Error(
      `Local path already exists: ${localPath}. Use -f flag to overwrite.`
    );
  }

  const summary: DownloadSummary = {
    startTime: Date.now(),
    endTime: 0,
    totalFiles: 0,
    transferredCount: 0,
    failedCount: 0,
    transferSize: 0,
    duration: 0,
    speed: 0,
  };

  // Check if ChRIS path is a file or directory
  const isDirectory = await chrisPath_isDirectory(resolvedChris);

  if (!isDirectory) {
    // Download single file
    try {
      const result = await fileContent_getBinary(resolvedChris);
      if (!result.ok) {
        throw new Error(result.error || "Failed to download file");
      }

      // Ensure parent directory exists
      const parentDir = path.dirname(localPath);
      await directory_ensureExists(parentDir);

      // Write file
      await fs.promises.writeFile(localPath, result.value);

      summary.totalFiles = 1;
      summary.transferredCount = 1;
      summary.transferSize = result.value.length;

      summary.endTime = Date.now();
      summary.duration = (summary.endTime - summary.startTime) / 1000;
      summary.speed = summary.duration > 0 ? summary.transferSize / summary.duration : 0;

      return summary;
    } catch (error: unknown) {
      summary.failedCount = 1;
      throw error;
    }
  }

  // Download directory
  console.log(chalk.cyan("Scanning files to download..."));
  const items: FsItem[] = await files_listRecursive(resolvedChris);
  const files = items.filter(item => item.type === 'file');

  summary.totalFiles = files.length;
  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

  // Apply Unix semantics: trailing slash determines merge behavior
  const targetDir: string = resolvedChris.endsWith('/')
    ? localPath  // Merge contents
    : path.join(localPath, path.basename(resolvedChris)); // Create subdir

  // Ensure target directory exists
  await directory_ensureExists(targetDir);

  // Setup progress bar
  const progressBar = new cliProgress.SingleBar(
    {
      format:
        "Downloading [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} files | {bytes}/{totalBytes}",
    },
    cliProgress.Presets.shades_classic
  );

  progressBar.start(files.length, 0, {
    bytes: bytes_format(0),
    totalBytes: bytes_format(totalSize),
  });

  // Download each file
  for (const [index, file] of files.entries()) {
    try {
      // Get file content
      const result = await fileContent_getBinary(file.path);
      if (!result.ok) {
        summary.failedCount++;
        console.log(chalk.yellow(`\nFailed to download: ${file.path}`));
        continue;
      }

      // Calculate relative path
      const relativePath = file.path.substring(resolvedChris.length).replace(/^\//, '');
      const localFilePath = path.join(targetDir, relativePath);

      // Ensure parent directory exists
      const parentDir = path.dirname(localFilePath);
      await directory_ensureExists(parentDir);

      // Write file
      await fs.promises.writeFile(localFilePath, result.value);

      summary.transferredCount++;
      summary.transferSize += result.value.length;
    } catch (error: unknown) {
      summary.failedCount++;
      const msg = error instanceof Error ? error.message : String(error);
      console.log(chalk.red(`\nError downloading ${file.path}: ${msg}`));
    }

    progressBar.update(index + 1, {
      bytes: bytes_format(summary.transferSize),
    });
  }

  progressBar.stop();

  summary.endTime = Date.now();
  summary.duration = (summary.endTime - summary.startTime) / 1000;
  summary.speed = summary.duration > 0 ? summary.transferSize / summary.duration : 0;

  return summary;
}
