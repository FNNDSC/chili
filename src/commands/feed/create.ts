/**
 * @file Implements the logic for creating new ChRIS feeds.
 *
 * This module provides functionality to create a new feed
 * from a set of directories and parameters.
 *
 * @module
 */
import { SimpleRecord, dictionary_fromCLI, ChRISObjectParams } from "@fnndsc/cumin";
import { feed_create as salsaFeed_create } from "@fnndsc/salsa";
import { CLIoptions } from "../../utils/cli.js";
import { Feed } from "../../models/feed.js";

/**
 * Creates a new ChRIS feed.
 *
 * Parses CLI options to extract feed parameters and input directories,
 * then invokes the creation process.
 *
 * @param options - CLI options including `params` (string) and `dirs` (string or array).
 * @returns A Promise resolving to a `Feed` object representing the created feed, or `null` on failure.
 * @throws {Error} If feed parameters cannot be parsed or if directories are missing.
 */
export async function feed_create(options: CLIoptions): Promise<Feed | null> {
  const params = options.params;
  const dirs = options.dirs; // Expects a comma-separated string for directories

  let feedParams: ChRISObjectParams = {};
  if (params) {
    try {
      feedParams = dictionary_fromCLI(params);
    } catch (e) {
      // Original error handling without errorStack.push
      throw new Error(`Error parsing feed parameters: ${e}`);
    }
  }

  const dirsArray: string[] = typeof dirs === 'string' ? dirs.split(',') : (Array.isArray(dirs) ? dirs : []);

  if (dirsArray.length === 0) {
    throw new Error("Directories for feed creation are required (e.g., --dirs '/some/path').");
  }

  const result = await salsaFeed_create(dirsArray, feedParams);
  return result as unknown as Feed;
}