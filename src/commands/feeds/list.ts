/**
 * @file Implements the logic for listing ChRIS feeds.
 *
 * This module provides functionality to fetch lists of feeds
 * from ChRIS using the `@fnndsc/salsa` library.
 *
 * @module
 */
import { feeds_list as salsaFeeds_list } from "@fnndsc/salsa";
import { FilteredResourceData } from "@fnndsc/cumin";
import { CLIoptions, options_toParams } from "../../utils/cli.js";

/**
 * Fetches a list of ChRIS feeds based on options.
 *
 * @param options - CLI options containing filtering/pagination parameters.
 * @returns A Promise resolving to `FilteredResourceData` or `null`.
 */
export async function feeds_fetchList(options: CLIoptions): Promise<FilteredResourceData | null> {
  const params: Record<string, string | number | boolean> = options_toParams(options);
  return await salsaFeeds_list(params);
}
