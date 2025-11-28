/**
 * @file File System View components.
 *
 * Provides standard output formatting for file system operations
 * (mkdir, touch, cat, upload).
 *
 * @module
 */
import chalk from 'chalk';

/**
 * Renders the result of a mkdir operation.
 * @param path - The path created.
 * @param success - Whether the operation succeeded.
 */
export function renderMkdir(path: string, success: boolean): string {
  if (success) {
    return chalk.green(`Created directory: ${path}`);
  } else {
    return chalk.red(`Failed to create directory: ${path}`);
  }
}

/**
 * Renders the result of a touch operation.
 * @param path - The path created.
 * @param success - Whether the operation succeeded.
 */
export function renderTouch(path: string, success: boolean): string {
  if (success) {
    return chalk.green(`Created file: ${path}`);
  } else {
    return chalk.red(`Failed to create file: ${path}`);
  }
}

/**
 * Renders the result of an upload operation.
 * @param local - Local path.
 * @param remote - Remote path.
 * @param success - Whether the operation succeeded.
 */
export function renderUpload(local: string, remote: string, success: boolean): string {
  if (success) {
    return chalk.green(`Successfully uploaded ${local}`);
  } else {
    return chalk.red(`Failed to upload ${local}`);
  }
}

/**
 * Renders the content of a file or an error message.
 * @param content - The file content or null if not found/error.
 * @param path - The file path (for error message).
 */
export function renderCat(content: string | null, path: string): string {
  if (content !== null) {
    return content;
  } else {
    return chalk.red(`File not found or empty: ${path}`);
  }
}
