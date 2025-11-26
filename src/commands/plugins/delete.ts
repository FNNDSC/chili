/**
 * @file Implements the logic for searching and deleting ChRIS plugins.
 *
 * This module provides functionality to search for plugins by name/term
 * and delete them by ID using the `@fnndsc/salsa` library.
 *
 * @module
 */
import { plugins_list as salsaPlugins_list, plugin_delete as salsaPlugin_delete } from "@fnndsc/salsa";
import { FilteredResourceData } from "@fnndsc/cumin";
import { CLIoptions, options_toParams } from "../../utils/cli.js";

/**
 * Resolves search terms to a list of plugin items.
 *
 * @param searchable - The search string.
 * @returns A Promise resolving to an array of plugin items (table data).
 */
export async function plugins_searchByTerm(searchable: string): Promise<Record<string, any>[]> {
  const options: CLIoptions = { search: searchable };
  const params: Record<string, string | number | boolean> = options_toParams(options);
  const results: FilteredResourceData | null = await salsaPlugins_list(params);

  if (!results || !results.tableData) {
    return [];
  }
  return results.tableData;
}

/**
 * Deletes a plugin by its ID.
 *
 * @param id - The plugin ID.
 * @returns A Promise resolving to `true` on success, `false` otherwise.
 */
export async function plugin_deleteById(id: number): Promise<boolean> {
  return await salsaPlugin_delete(id);
}
