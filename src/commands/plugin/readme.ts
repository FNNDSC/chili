/**
 * @file Implements the logic for retrieving a ChRIS plugin's README.
 *
 * This module provides functionality to fetch the README content
 * for a specific plugin by its ID.
 *
 * @module
 */
import { plugin_readme as salsaPlugin_readme } from "@fnndsc/salsa";

/**
 * Fetches the README content for a plugin.
 *
 * @param pluginId - The ID of the plugin.
 * @returns A Promise resolving to the README content as a string, or `null` if not available.
 */
export async function pluginReadme_fetch(pluginId: string): Promise<string | null> {
  return await salsaPlugin_readme(pluginId);
}
