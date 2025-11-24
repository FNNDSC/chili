import { SimpleRecord, dictionary_fromCLI, ChRISObjectParams } from "@fnndsc/cumin";
import { feed_create } from "@fnndsc/salsa";
import { CLIoptions } from "../../utils/cli.js";

/**
 * Core logic for 'feed create'.
 * Handles parameter parsing and calls salsa.feed_create.
 *
 * @param options - CLI options including params and dirs.
 * @returns Promise resolving to SimpleRecord of created feed, or null.
 */
export async function feed_doCreate(options: CLIoptions): Promise<SimpleRecord | null> {
  const params = options.params;
  const dirs = options.dirs; // Expects a comma-separated string for directories

  let feedParams: ChRISObjectParams = {};
  if (params) {
    try {
      feedParams = dictionary_fromCLI(params);
    } catch (e) {
      throw new Error(`Error parsing feed parameters: ${e}`);
    }
  }

  // salsa.feed_create expects dirs as string[], but CLI provides comma-separated string
  const dirsArray = typeof dirs === 'string' ? dirs.split(',') : (Array.isArray(dirs) ? dirs : []);

  if (dirsArray.length === 0) {
    throw new Error("Directories for feed creation are required (e.g., --dirs '/some/path').");
  }

  return await feed_create(dirsArray, feedParams);
}
