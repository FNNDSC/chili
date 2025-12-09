/**
 * @file Implements the logic for viewing the content of ChRIS files.
 *
 * This module provides functionality to retrieve the content of a file
 * either by its direct ID or by resolving a name/path search term.
 *
 * @module
 */
import { fileContent_get } from "@fnndsc/salsa";
import { Result } from "@fnndsc/cumin";

/**
 * Fetches the content of a ChRIS file as a UTF-8 string.
 *
 * @param fileIdentifier - The path of the file to view.
 * @returns A Promise resolving to the file content as a string, or `null` if empty/not found.
 * @throws {Error} If the operation fails and an error is pushed to the stack.
 */
export async function files_viewContent(fileIdentifier: string): Promise<string | null> {
  const result: Result<string> = await fileContent_get(fileIdentifier);
  
  if (!result.ok) {
    // Errors are pushed to the stack within salsa, so we can just throw a generic error here
    // or let the controller handle it by checking the error stack. For now, let's throw.
    throw new Error(`Failed to view content for: ${fileIdentifier}`);
  }

  return result.value;
}
