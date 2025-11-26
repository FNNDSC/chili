/**
 * @file Implements the logic for viewing the content of ChRIS files.
 *
 * This module provides functionality to retrieve the content of a file
 * either by its direct ID or by resolving a name/path search term.
 *
 * @module
 */
import { files_view as salsaFiles_view } from "@fnndsc/salsa";
import { files_fetchList } from "../files/list.js";
import { CLIoptions } from "../../utils/cli.js";
import { FilteredResourceData } from "@fnndsc/cumin";

/**
 * Fetches the content of a ChRIS file as a UTF-8 string.
 *
 * @param fileIdentifier - The ID (numeric string) or name/path of the file to view.
 * @returns A Promise resolving to the file content as a string, or `null` if empty/not found.
 * @throws {Error} If the file cannot be found or its ID cannot be determined.
 */
export async function files_viewContent(fileIdentifier: string): Promise<string | null> {
  let fileId: number;

  if (/^\d+$/.test(fileIdentifier)) {
    fileId = parseInt(fileIdentifier, 10);
  } else {
    // Resolve name/path to ID
    // We treat fileIdentifier as a search term
    const options: CLIoptions = { search: fileIdentifier };
    // We search in 'files' asset type
    const results: FilteredResourceData | null = await files_fetchList(options, "files");
    
    if (!results || !results.tableData || results.tableData.length === 0) {
        throw new Error(`File not found: ${fileIdentifier}`);
    }
    
    // Assume first match
    const item: Record<string, any> = results.tableData[0];
    if (!item.id) {
        throw new Error(`Could not determine ID for file: ${fileIdentifier}`);
    }
    fileId = item.id;
  }

  const buffer: Buffer | null = await salsaFiles_view(fileId);
  if (!buffer) return null;
  return buffer.toString('utf-8');
}
