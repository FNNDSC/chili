/**
 * @file Implements the core logic for the `mkdir` command in the ChRIS CLI.
 *
 * This module provides functionality to create new directories
 * within the ChRIS file system. It interacts with the `@fnndsc/salsa` library.
 *
 * @module
 */
import { files_mkdir as salsaFiles_mkdir } from "@fnndsc/salsa";
import { path_resolveChrisFs } from "../../utils/cli.js";

/**
 * Core logic for the 'mkdir' command.
 * This function does not perform any console output.
 *
 * @param dirPath - The full or relative ChRIS path for the new folder.
 * @returns A Promise resolving to true on success, false on failure.
 */
export async function files_mkdir(dirPath: string): Promise<boolean> {
  const resolvedPath = await path_resolveChrisFs(dirPath, {});
  return await salsaFiles_mkdir(resolvedPath);
}
