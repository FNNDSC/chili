/**
 * @file Implements the logic for running (executing) a ChRIS plugin.
 *
 * This module provides functionality to parse CLI parameters and trigger
 * a plugin instance execution on the ChRIS backend.
 *
 * @module
 */
import { Dictionary, dictionary_fromCLI } from "@fnndsc/cumin";
import { plugin_run as salsaPlugin_run } from "@fnndsc/salsa";
import { PluginInstance } from "../../models/plugin.js";

/**
 * Executes a ChRIS plugin with the specified parameters.
 *
 * @param searchable - The plugin identifier (ID or name) to run.
 * @param params - The raw parameter string from the CLI (e.g., "--param1 value1 --param2 value2").
 * @returns A Promise resolving to the created plugin instance, or `null` on failure.
 * @throws {Error} If the parameter string cannot be parsed.
 */
export async function plugin_execute(searchable: string, params: string): Promise<PluginInstance | null> {
  let parsedParams: Dictionary = {};
  try {
    parsedParams = dictionary_fromCLI(params);
  } catch (e) {
    throw new Error(`Error parsing plugin parameters: ${e}`);
  }
  const result = await salsaPlugin_run(searchable, parsedParams);
  return result as unknown as PluginInstance;
}