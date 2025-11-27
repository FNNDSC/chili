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

/**
 * Fetches a list of ChRIS plugins based on options.
 *
 * @param options - CLI options containing filtering/pagination parameters.
 * @returns A Promise resolving to `FilteredResourceData` or `null`.
 */
export async function plugins_fetchList(options: CLIoptions): Promise<FilteredResourceData | null> {
  const params: Record<string, string | number | boolean> = options_toParams(options);
  
  if (options.all) {
    // If 'all' is requested, use listAll which handles pagination internally.
    // We cast params to any because listAll expects ListOptions but options_toParams returns Record
    return await salsaPlugins_listAll(params as any);
  }
  
  return await salsaPlugins_list(params);
}
