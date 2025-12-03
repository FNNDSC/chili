/**
 * @file Implements the core logic for the `touch` command in the ChRIS CLI.
 *
 * This module provides functionality to create empty files or files with content
 * within the ChRIS file system. It interacts with the `@fnndsc/salsa` library.
 *
 * @module
 */
import fs from 'fs';
import { files_touch as salsaFiles_touch } from "@fnndsc/salsa";
import { path_resolveChrisFs } from "../../utils/cli.js";
import { errorStack, Result, Ok, Err } from "@fnndsc/cumin";

/**
 * Options for the touch command.
 */
export interface TouchOptions {
  withContents?: string;
  withContentsFromFile?: string;
}

/**
 * Reads content from a local file with proper error handling.
 *
 * @param localFilePath - Path to the local file on the host system.
 * @returns Result<string> containing file contents or error.
 */
function fileContents_read(localFilePath: string): Result<string> {
  try {
    if (!fs.existsSync(localFilePath)) {
      errorStack.stack_push("error", `Local file not found: ${localFilePath}`);
      return Err();
    }

    const content: string = fs.readFileSync(localFilePath, 'utf-8');
    return Ok(content);
  } catch (error: unknown) {
    const msg: string = error instanceof Error ? error.message : String(error);
    errorStack.stack_push("error", `Failed to read local file ${localFilePath}: ${msg}`);
    return Err();
  }
}

/**
 * Core logic for the 'touch' command.
 * This function does not perform any console output.
 *
 * @param filePath - The full or relative ChRIS path for the new file.
 * @param options - Optional parameters for content injection.
 * @returns A Promise resolving to true on success, false on failure.
 */
export async function files_touch(
  filePath: string,
  options: TouchOptions = {}
): Promise<boolean> {
  const resolvedPath: string = await path_resolveChrisFs(filePath, {});

  // Determine content to write
  let content: string | undefined;

  if (options.withContentsFromFile) {
    // Read content from local file
    const result: Result<string> = fileContents_read(options.withContentsFromFile);
    if (!result.ok) {
      return false;
    }
    content = result.value;
  } else if (options.withContents !== undefined) {
    // Use provided string content
    content = options.withContents;
  }

  return await salsaFiles_touch(resolvedPath, content);
}
