import { files_list, files_delete } from "@fnndsc/salsa";
import { FilteredResourceData } from "@fnndsc/cumin";
import { CLIoptions, options_toParams } from "../../utils/cli";

/**
 * Resolves search terms to a list of file items.
 *
 * @param searchable - The search string.
 * @param assetName - The asset name ('files', 'links', 'dirs').
 * @returns A Promise resolving to an array of file items.
 */
export async function files_delete_search(searchable: string, assetName: string): Promise<any[]> {
  const options: CLIoptions = { search: searchable };
  const params = options_toParams(options);
  const results: FilteredResourceData | null = await files_list(params, assetName);

  if (!results || !results.tableData) {
    return [];
  }
  return results.tableData;
}

/**
 * Deletes a file by ID.
 *
 * @param id - The file ID.
 * @param assetName - The asset name.
 * @returns A Promise resolving to true on success.
 */
export async function files_delete_do(id: number, assetName: string): Promise<boolean> {
  return await files_delete(id, assetName);
}
