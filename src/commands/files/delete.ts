/**
 * @file Implements the logic for searching and deleting ChRIS file resources.
 *
 * This module provides functionality to search for files by term and delete them
 * by ID, utilizing the `@fnndsc/salsa` library.
 *
 * @module
 */
import { files_list as salsaFiles_list, files_delete as salsaFiles_delete } from "@fnndsc/salsa";
import { FilteredResourceData } from "@fnndsc/cumin";
import { CLIoptions, options_toParams } from "../../utils/cli.js";

/**
 * Resolves search terms to a list of file items.
 *
 * @param searchable - The search string.
 * @param assetName - The asset name ('files', 'links', 'dirs').
 * @returns A Promise resolving to an array of file items (table data).
 */
export async function files_searchByTerm(searchable: string, assetName: string): Promise<Record<string, any>[]> {
  const options: CLIoptions = { search: searchable };
  const params: Record<string, string | number | boolean> = options_toParams(options);
  const results: FilteredResourceData | null = await salsaFiles_list(params, assetName);

  if (!results || !results.tableData) {
    return [];
  }
  return results.tableData;
}

/**
 * Deletes a file resource by its ID.
 *
 * @param id - The ID of the file/resource to delete.
 * @param assetName - The asset name ('files', 'links', 'dirs').
 * @returns A Promise resolving to `true` on success, `false` otherwise.
 */
export async function files_deleteById(id: number, assetName: string): Promise<boolean> {
  return await salsaFiles_delete(id, assetName);
}
