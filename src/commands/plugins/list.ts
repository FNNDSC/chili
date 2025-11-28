/**
 * @file Implements the logic for listing ChRIS plugin resources.
 *
 * This module provides functionality to fetch lists of plugins
 * from ChRIS using the `@fnndsc/salsa` library.
 *
 * @module
 */
import { 
  plugins_list as salsaPlugins_list,
  plugins_listAll as salsaPlugins_listAll 
} from "@fnndsc/salsa";
import { FilteredResourceData } from "@fnndsc/cumin";
import { CLIoptions, options_toParams } from "../../utils/cli.js";
import { Plugin } from "../../models/plugin.js";

/**
 * Fetches a list of ChRIS plugins based on options.
 *
 * @param options - CLI options containing filtering/pagination parameters.
 * @returns A Promise resolving to an array of Plugin objects.
 */
export async function plugins_fetchList(options: CLIoptions): Promise<Plugin[]> {
  const params: Record<string, string | number | boolean> = options_toParams(options);
  
  let result: FilteredResourceData | null;

  if (options.all) {
    result = await salsaPlugins_listAll(params as any);
  } else {
    result = await salsaPlugins_list(params);
  }

  if (result && result.tableData) {
    return result.tableData as unknown as Plugin[];
  }
  return [];
}