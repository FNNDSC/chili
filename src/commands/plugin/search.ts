/**
 * @file Implements the logic for resolving plugin identifiers to IDs.
 *
 * This module provides functionality to search for plugins and retrieve
 * their IDs, often used as a precursor to other operations like `run` or `readme`.
 *
 * @module
 */
import { plugins_searchableToIDs as salsaPlugins_searchableToIDs } from "@fnndsc/salsa";

/**
 * Resolves a search term (name or ID) to a list of matching plugin IDs.
 *
 * @param searchable - The search string (e.g., plugin name or "id:123").
 * @returns A Promise resolving to an array of plugin ID strings, or `null` if none found.
 */
export async function pluginIds_resolve(searchable: string): Promise<string[] | null> {
  return await salsaPlugins_searchableToIDs(searchable);
}
