/**
 * @file Implements the core logic for the `cat` command.
 * @module
 */
import { fileContent_get, fileContent_getBinary } from "@fnndsc/salsa";
import { path_resolveChrisFs } from "../../utils/cli.js";
import { Result } from "@fnndsc/cumin";

/**
 * Retrieves the content of a file.
 *
 * @param filePath - The path to the file.
 * @returns Promise resolving to content string or null.
 */
export async function files_cat(filePath: string): Promise<Result<string>> {
  const resolved: string = await path_resolveChrisFs(filePath, {});
  return await fileContent_get(resolved);
}

/**
 * Retrieves the binary content of a file.
 *
 * @param filePath - The path to the file.
 * @returns Promise resolving to content Buffer or error.
 */
export async function files_catBinary(filePath: string): Promise<Result<Buffer>> {
  const resolved: string = await path_resolveChrisFs(filePath, {});
  return await fileContent_getBinary(resolved);
}
