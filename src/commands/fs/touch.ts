import { files_touch } from "@fnndsc/salsa";

/**
 * Core logic for the 'touch' command.
 * This function does not perform any console output.
 *
 * @param filePath - The full ChRIS path for the new empty file.
 * @returns A Promise resolving to true on success, false on failure.
 */
export async function files_doTouch(filePath: string): Promise<boolean> {
  return await files_touch(filePath);
}
