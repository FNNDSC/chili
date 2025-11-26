/**
 * @file Implements the core logic for the `create` command in the ChRIS CLI.
 *
 * This module provides functionality to create new files within the ChRIS
 * file system, allowing content to be specified directly or read from a local file.
 * It interacts with `@fnndsc/salsa` for file creation and `@fnndsc/cumin`
 * for error handling.
 *
 * @module
 */
import { files_create as salsaFiles_create } from "@fnndsc/salsa";
import { path_resolveChrisFs, CLIoptions } from "../../utils/cli.js";
import * as fs from "fs";
import { errorStack_getAllOfType } from "@fnndsc/cumin";

/**
 * Retrieves the content for a new file based on provided CLI options.
 *
 * This function handles content specified directly via `--content` or
 * read from a local file path via `--from-file`. It ensures that only one
 * content source is used and validates the existence of local files.
 *
 * @param options - CLI options, which may include `content` (string) or `fromFile` (path to a local file).
 * @returns The file content as a `string` or `Buffer`.
 * @throws {Error} If both `--content` and `--from-file` are used, or if the local file specified by `--from-file` is not found.
 */
function content_get(options: CLIoptions): string | Buffer {
  if (options.content && options.fromFile) {
    throw new Error('Cannot use both --content and --from-file. Please choose one.');
  }
  if (options.content) {
    return options.content;
  }
  if (options.fromFile) {
    if (!fs.existsSync(options.fromFile)) {
        throw new Error(`Local file not found at ${options.fromFile}`);
    }
    return fs.readFileSync(options.fromFile);
  }
  // Default to empty content if no source is specified
  return "";
}

/**
 * Core logic for the 'file create' command.
 *
 * This function handles the creation of a new file in the ChRIS file system.
 * It resolves the target path, retrieves the content, and calls the
 * underlying file creation service. It also includes robust error handling
 * and provides informative error messages.
 *
 * @param fileIdentifier - The primary argument for the file (name or path). Can be undefined if options.name is provided.
 * @param options - CLI options including `--content`, `--from-file`, `--path`, `--name`.
 * @returns A Promise resolving to `true` on successful file creation, `false` otherwise.
 * @throws {Error} On invalid input (e.g., missing filename), issues with content retrieval, or if underlying file creation operations fail.
 */
export async function files_create(fileIdentifier: string | undefined, options: CLIoptions): Promise<boolean> {
  if (!fileIdentifier && !options.name) {
    throw new Error('Filename or path is required.');
  }

  try {
    const content: string | Buffer = content_get(options);
    const resolvedChRISPath: string = await path_resolveChrisFs(fileIdentifier, options);
    const success: boolean = await salsaFiles_create(content, resolvedChRISPath);
    
    if (!success) {
      const errorStackItems: string[] = errorStack_getAllOfType("error");
      if (errorStackItems.length > 0) {
        // We throw here so that the calling handler can decide how to display the error.
        throw new Error(errorStackItems.join(', '));
      } else {
        throw new Error(`An unknown error occurred while creating the file at ${resolvedChRISPath}.`);
      }
    }
    return success;
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Re-throw with a more specific prefix to aid debugging
      throw new Error(`Error creating file: ${error.message}`);
    }
    // Re-throw anything else
    throw error;
  }
}