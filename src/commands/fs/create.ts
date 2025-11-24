import { files_create } from "@fnndsc/salsa";
import { path_resolve_chrisfs, CLIoptions } from "../../utils/cli";
import * as fs from "fs"; // Import Node.js 'fs' for reading local files

/**
 * Core logic for the 'file create' command.
 * This function does not perform any console output.
 *
 * @param fileIdentifier - The primary argument for the file (name or path).
 * @param options - CLI options including `--content`, `--from-file`, `--path`, `--name`.
 * @returns A Promise resolving to true on success, false on failure.
 */
export async function files_create_do(fileIdentifier: string | undefined, options: CLIoptions): Promise<boolean> {
  try {
    if (!fileIdentifier && !options.name) {
      throw new Error("Filename or path is required.");
    }
    if (options.content && options.fromFile) {
      throw new Error("Cannot use both --content and --from-file. Please choose one.");
    }

    const resolvedChRISPath = await path_resolve_chrisfs(fileIdentifier, options);

    let content: string | Buffer | Blob = '';
    if (options.content) {
      content = options.content;
    } else if (options.fromFile) {
      if (!fs.existsSync(options.fromFile)) {
        throw new Error(`Local file not found at ${options.fromFile}`);
      }
      content = fs.readFileSync(options.fromFile);
    } else {
      // No content or from-file specified, create an empty file
      content = '';
    }

    const success = await files_create(content, resolvedChRISPath);
    return success;

  } catch (error: any) {
    throw new Error(`Error creating file: ${error.message}`);
  }
}
