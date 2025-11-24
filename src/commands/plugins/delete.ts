import { plugins_list, plugin_delete } from "@fnndsc/salsa";
import { FilteredResourceData } from "@fnndsc/cumin";
import { CLIoptions, options_toParams } from "../../utils/cli.js";

/**
 * Resolves search terms to a list of plugin items.
 *
 * @param searchable - The search string.
 * @returns A Promise resolving to an array of plugin items.
 */
export async function plugins_search(searchable: string): Promise<any[]> {
  const options: CLIoptions = { search: searchable };
  const params = options_toParams(options);
  const results: FilteredResourceData | null = await plugins_list(params);

  if (!results || !results.tableData) {
    return [];
  }
  return results.tableData;
}

/**
 * Deletes a plugin by ID.
 *
 * @param id - The plugin ID.
 * @returns A Promise resolving to true on success.
 */
export async function plugins_doDelete(id: number): Promise<boolean> {
  return await plugin_delete(id);
}
