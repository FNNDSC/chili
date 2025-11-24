import { Dictionary, CLI_toDictionary } from "@fnndsc/cumin";
import { plugin_run } from "@fnndsc/salsa";

/**
 * Core logic for 'plugin run'.
 * Parses the CLI parameter string into a dictionary and calls salsa.plugin_run.
 *
 * @param searchable - The plugin search string.
 * @param params - The raw plugin parameters string from CLI.
 * @returns Promise resolving to the plugin instance dictionary or null.
 */
export async function plugin_run_do(searchable: string, params: string): Promise<Dictionary | null> {
  let parsedParams: Dictionary = {};
  try {
    parsedParams = CLI_toDictionary(params);
  } catch (e) {
    throw new Error(`Error parsing plugin parameters: ${e}`);
  }
  return await plugin_run(searchable, parsedParams);
}
