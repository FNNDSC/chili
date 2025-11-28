/**
 * @file Implements the core logic for the `cat` command.
 * @module
 */
import { files_content } from "@fnndsc/salsa";
import { path_resolveChrisFs } from "../../utils/cli.js";

/**
 * Retrieves the content of a file.
 *
 * @param filePath - The path to the file.
 * @returns Promise resolving to content string or null.
 */
export async function files_cat(filePath: string): Promise<string | null> {
  const resolved: string = await path_resolveChrisFs(filePath, {});
  return await files_content(resolved);
}
