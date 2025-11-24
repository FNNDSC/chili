import { plugins_searchableToIDs } from "@fnndsc/salsa";

/**
 * Core logic for 'plugin search'.
 *
 * @param searchable - The search string.
 * @returns Promise resolving to array of IDs or null.
 */
export async function plugin_search(searchable: string): Promise<string[] | null> {
  return await plugins_searchableToIDs(searchable);
}
