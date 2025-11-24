import { files_create } from "@fnndsc/salsa";
import { path_resolve_chrisfs, CLIoptions } from "../../utils/cli";
import * as fs from "fs";
import { errorStack } from "@fnndsc/cumin";

/**
 * Gets the content for a new file, throwing errors for invalid states.
 *
 * @param options - CLI options, including `--content` and `--from-file`.
 * @returns The content as a string or Buffer.
 * @throws Error if both --content and --from-file are used, or if a local file is not found.
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
 * @param fileIdentifier - The primary argument for the file (name or path).
 * @param options - CLI options including `--content`, `--from-file`, `--path`, `--name`.
 * @returns A Promise resolving to true on success, false on failure.
 * @throws Error on invalid input or if underlying operations fail.
 */
export async function files_create_do(fileIdentifier: string | undefined, options: CLIoptions): Promise<boolean> {
  if (!fileIdentifier && !options.name) {
    throw new Error('Filename or path is required.');
  }

  try {
    const content: string | Buffer = content_get(options);
    const resolvedChRISPath: string = await path_resolve_chrisfs(fileIdentifier, options);
    const success: boolean = await files_create(content, resolvedChRISPath);
    
    if (!success) {
      const errorStackItems: string[] = errorStack.allOfType_get("error");
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