import { files_mkdir } from "@fnndsc/salsa";

/**
 * Core logic for the 'mkdir' command.
 * This function does not perform any console output.
 *
 * @param dirPath - The full ChRIS path for the new folder.
 * @returns A Promise resolving to true on success, false on failure.
 */
export async function files_doMkdir(dirPath: string): Promise<boolean> {
  return await files_mkdir(dirPath);
}
