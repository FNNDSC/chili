/**
 * @file Download command implementation.
 * @module
 */
import { fileContent_getBinaryStream, files_listRecursive, FsItem } from "@fnndsc/salsa";
import { path_resolveChrisFs } from "../../utils/cli.js";
import fs from "fs";
import path from "path";
import cliProgress from "cli-progress";
import chalk from "chalk";
import { pipeline } from "stream/promises";
import { bytes_format, eta_format, rate_format } from "./upload.js";
import { prompt_confirmOrThrow } from "../../utils/input_format.js";

export { bytes_format };

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
    const items: FsItem[] = await files_listRecursive(chrisPath);
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
  const resolvedChris: string = await path_resolveChrisFs(chrisPath, {});

  // Check if local path exists (only block overwriting regular files unless force)
  if (fs.existsSync(localPath)) {
    const localStat: fs.Stats = await fs.promises.stat(localPath);
    if (localStat.isFile() && !options.force) {
      throw new Error(
        `Local path already exists: ${localPath}. Use -f flag to overwrite.`
      );
    }
    // If it's a directory, allow and handle below.
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
  const isDirectory: boolean = await chrisPath_isDirectory(resolvedChris);

  if (!isDirectory) {
    // Download single file
    try {
      const result = await fileContent_getBinaryStream(resolvedChris);
      if (!result.ok) {
        throw new Error(result.error || "Failed to download file");
      }

      const { stream, size } = result.value as {
        stream: NodeJS.ReadableStream;
        size?: number;
        filename?: string;
      };

      // If localPath is a directory, place the file inside using remote basename
      const stats: fs.Stats | null = fs.existsSync(localPath) ? await fs.promises.stat(localPath) : null;
      const finalLocalPath: string =
        stats && stats.isDirectory()
          ? path.join(localPath, path.basename(resolvedChris))
          : localPath;

      // Warn if target file already exists (non-overwrite) or directory already exists
      if (fs.existsSync(finalLocalPath)) {
        const existingStat: fs.Stats = await fs.promises.stat(finalLocalPath);
        if (existingStat.isFile()) {
          if (!options.force) {
            await prompt_confirmOrThrow(
              `Local file exists at ${finalLocalPath}. Overwrite? (y/N)`
            );
          }
        } else if (existingStat.isDirectory()) {
          if (!options.force) {
            await prompt_confirmOrThrow(
              `Target directory exists. Download into existing folder: ${finalLocalPath}? (y/N)`
            );
          }
        }
      }

      // Ensure parent directory exists
      const parentDir = path.dirname(finalLocalPath);
      await directory_ensureExists(parentDir);

      const showProgress: boolean = !!process.stdout.isTTY;
      const progressBar =
        typeof size === "number" && showProgress
          ? new cliProgress.SingleBar(
              {
                format:
                  "Downloading [{bar}] {percentage}% | ETA: {etaHuman} | Rate: {rate} | {bytes}/{totalBytes}",
              },
              cliProgress.Presets.shades_classic
            )
          : null;

      if (progressBar) {
        progressBar.start(size!, 0, {
          etaHuman: "--",
          rate: "--",
          bytes: bytes_format(0),
          totalBytes: bytes_format(size!),
        });
      }

      let transferred: number = 0;
      const writeStream: fs.WriteStream = fs.createWriteStream(finalLocalPath);
      stream.on("data", (chunk: Buffer) => {
        transferred += chunk.length;
        if (progressBar) {
          const elapsedSeconds: number = Math.max(
            1e-6,
            (Date.now() - summary.startTime) / 1000
          );
          const rateCurrent: number = transferred / elapsedSeconds;
          const remainingBytes: number = Math.max(0, (size ?? transferred) - transferred);
          const etaSeconds: number | null =
            rateCurrent > 0 ? remainingBytes / rateCurrent : null;

          progressBar.update(Math.min(transferred, size || transferred), {
            etaHuman: eta_format(etaSeconds),
            rate: rate_format(rateCurrent),
            bytes: bytes_format(transferred),
            totalBytes: bytes_format(size ?? transferred),
          });
        }
      });

      await pipeline(stream, writeStream);

      if (progressBar) {
        progressBar.update(size || transferred);
        progressBar.stop();
      }

      summary.totalFiles = 1;
      summary.transferredCount = 1;
      summary.transferSize = transferred;

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
  const files: FsItem[] = items.filter((item: FsItem) => item.type === 'file');

  summary.totalFiles = files.length;
  const totalSize: number = files.reduce((sum: number, f: FsItem) => sum + (f.size || 0), 0);

  // Apply Unix semantics: trailing slash determines merge behavior
  const targetDir: string = resolvedChris.endsWith('/')
    ? localPath  // Merge contents
    : path.join(localPath, path.basename(resolvedChris)); // Create subdir

  // Warn/confirm if target directory exists
  if (fs.existsSync(targetDir)) {
    const statTarget: fs.Stats = await fs.promises.stat(targetDir);
    if (statTarget.isDirectory()) {
      const entries: string[] = await fs.promises.readdir(targetDir);
      if (!options.force) {
        await prompt_confirmOrThrow(
          `Target directory exists${entries.length ? ' (will merge contents)' : ''}: ${targetDir}. Continue? (y/N)`
        );
      }
    } else if (statTarget.isFile()) {
      if (!options.force) {
        await prompt_confirmOrThrow(
          `Local file exists at ${targetDir}. Overwrite? (y/N)`
        );
      }
    }
  }

  // Ensure target directory exists
  await directory_ensureExists(targetDir);

  // Setup progress bar
  const showProgress: boolean = !!process.stdout.isTTY;
  const progressBar = showProgress
    ? new cliProgress.SingleBar(
        {
          format:
            "Downloading [{bar}] {percentage}% | ETA: {etaHuman} | Rate: {rate} | {value}/{total} files | {bytes}/{totalBytes}",
        },
        cliProgress.Presets.shades_classic
      )
    : null;

  if (progressBar) {
    progressBar.start(files.length, 0, {
      bytes: bytes_format(0),
      totalBytes: bytes_format(totalSize),
      etaHuman: "--",
      rate: "--",
    });
  }

  // Download each file
  for (const [index, file] of files.entries()) {
    try {
      const result = await fileContent_getBinaryStream(file.path);
      if (!result.ok) {
        summary.failedCount++;
        console.log(chalk.yellow(`\nFailed to download: ${file.path}`));
        continue;
      }

      const { stream, size } = result.value as {
        stream: NodeJS.ReadableStream;
        size?: number;
        filename?: string;
      };

      // Calculate relative path
      const relativePath: string = file.path.substring(resolvedChris.length).replace(/^\//, '');
      const localFilePath: string = path.join(targetDir, relativePath);

      // Ensure parent directory exists
      const parentDir: string = path.dirname(localFilePath);
      await directory_ensureExists(parentDir);

      const writeStream: fs.WriteStream = fs.createWriteStream(localFilePath);
      let transferred: number = 0;
      stream.on("data", (chunk: Buffer) => {
        transferred += chunk.length;
      });
      await pipeline(stream, writeStream);

      summary.transferredCount++;
      summary.transferSize += size ?? transferred;
    } catch (error: unknown) {
      summary.failedCount++;
      const msg = error instanceof Error ? error.message : String(error);
      console.log(chalk.red(`\nError downloading ${file.path}: ${msg}`));
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
  summary.duration = (summary.endTime - summary.startTime) / 1000;
  summary.speed = summary.duration > 0 ? summary.transferSize / summary.duration : 0;

  return summary;
}
