/**
 * @file Implements the core logic for the `touch` command in the ChRIS CLI.
 *
 * This module provides functionality to create empty files
 * within the ChRIS file system. It interacts with the `@fnndsc/salsa` library.
 *
 * @module
 */
import { files_touch as salsaFiles_touch } from "@fnndsc/salsa";
import { path_resolveChrisFs } from "../../utils/cli.js";

/**
 * Core logic for the 'touch' command.
 * This function does not perform any console output.
 *
 * @param filePath - The full or relative ChRIS path for the new empty file.
 * @returns A Promise resolving to true on success, false on failure.
 */
export async function files_touch(filePath: string): Promise<boolean> {
  const resolvedPath = await path_resolveChrisFs(filePath, {});
  return await salsaFiles_touch(resolvedPath);
}
