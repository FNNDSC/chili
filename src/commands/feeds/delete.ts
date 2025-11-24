import { feeds_list, feed_delete } from "@fnndsc/salsa";
import { FilteredResourceData } from "@fnndsc/cumin";
import { CLIoptions, options_toParams } from "../../utils/cli.js";

/**
 * Resolves search terms to a list of feed items.
 *
 * @param searchable - The search string.
 * @returns A Promise resolving to an array of feed items.
 */
export async function feeds_delete_search(searchable: string): Promise<any[]> {
  const options: CLIoptions = { search: searchable };
  const params = options_toParams(options);
  const results: FilteredResourceData | null = await feeds_list(params);

  if (!results || !results.tableData) {
    return [];
  }
  return results.tableData;
}

/**
 * Deletes a feed by ID.
 *
 * @param id - The feed ID.
 * @returns A Promise resolving to true on success.
 */
export async function feeds_delete_do(id: number): Promise<boolean> {
  return await feed_delete(id);
}
