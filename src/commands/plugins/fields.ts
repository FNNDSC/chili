/**
 * @file Implements the logic for retrieving available fields for ChRIS plugins.
 *
 * This module provides functionality to fetch the list of valid fields
 * that can be displayed or queried for registered plugins.
 *
 * @module
 */
import { pluginFields_get as salsaPluginFields_get } from "@fnndsc/salsa";

/**
 * Fetches the list of available fields for plugins.
 *
 * @returns A Promise resolving to an array of field names, or `null` if retrieval fails.
 */
export async function pluginFields_fetch(): Promise<string[] | null> {
  return await salsaPluginFields_get();
}
