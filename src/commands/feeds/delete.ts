/**
 * @file Implements the logic for searching and deleting ChRIS feeds.
 *
 * This module provides functionality to search for feeds by term
 * and delete them by ID using the `@fnndsc/salsa` library.
 *
 * @module
 */
import { feeds_list as salsaFeeds_list, feed_delete as salsaFeed_delete } from "@fnndsc/salsa";
import { FilteredResourceData } from "@fnndsc/cumin";
import { CLIoptions, options_toParams } from "../../utils/cli.js";

/**
 * Resolves search terms to a list of feed items.
 *
 * @param searchable - The search string.
 * @returns A Promise resolving to an array of feed items (table data).
 */
export async function feeds_searchByTerm(searchable: string): Promise<Record<string, any>[]> {
  const options: CLIoptions = { search: searchable };
  const params: Record<string, string | number | boolean> = options_toParams(options);
  const results: FilteredResourceData | null = await salsaFeeds_list(params);

  if (!results || !results.tableData) {
    return [];
  }
  return results.tableData;
}

/**
 * Deletes a feed by its ID.
 *
 * @param id - The ID of the feed to delete.
 * @returns A Promise resolving to `true` on success, `false` otherwise.
 */
export async function feed_deleteById(id: number): Promise<boolean> {
  return await salsaFeed_delete(id);
}
