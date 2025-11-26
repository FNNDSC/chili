/**
 * @file Implements the logic for listing ChRIS file resources.
 *
 * This module provides functionality to fetch lists of files, directories, or links
 * from ChRIS using the `@fnndsc/salsa` library. It handles option parsing
 * and delegates the actual API call.
 *
 * @module
 */
import { files_list as salsaFiles_list } from "@fnndsc/salsa";
import { FilteredResourceData } from "@fnndsc/cumin";
import { CLIoptions, options_toParams } from "../../utils/cli.js";

/**
 * Fetches a list of ChRIS resources (files, links, or dirs) based on options.
 *
 * @param options - CLI options containing filtering/pagination parameters.
 * @param assetName - The type of asset to list ('files', 'links', 'dirs'). Defaults to 'files'.
 * @param path - Optional ChRIS path to list resources from.
 * @returns A Promise resolving to `FilteredResourceData` or `null` if the request fails/returns nothing.
 */
export async function files_fetchList(
  options: CLIoptions, 
  assetName: string = "files", 
  path?: string
): Promise<FilteredResourceData | null> {
  const params: Record<string, string | number | boolean> = options_toParams(options);
  return await salsaFiles_list(params, assetName, path);
}
