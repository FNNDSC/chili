import { plugin_readme } from "@fnndsc/salsa";

/**
 * Core logic for 'plugin readme'.
 *
 * @param pluginId - The plugin ID.
 * @returns Promise resolving to string content or null.
 */
export async function plugin_doReadme(pluginId: string): Promise<string | null> {
  return await plugin_readme(pluginId);
}
