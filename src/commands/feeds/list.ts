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
import { Feed } from "../../models/feed.js";
import { list_applySort } from "../../utils/sort.js";

/**
 * Result structure for feed listing.
 */
export interface FeedListResult {
  feeds: Feed[];
  selectedFields: string[];
}

/**
 * Fetches a list of ChRIS feeds based on options.
 *
 * @param options - CLI options containing filtering/pagination parameters.
 * @returns A Promise resolving to a `FeedListResult` object.
 */
export async function feeds_fetchList(options: CLIoptions): Promise<FeedListResult> {
  const params: Record<string, string | number | boolean> = options_toParams(options);
  const result: FilteredResourceData | null = await salsaFeeds_list(params);

  if (result && result.tableData) {
    let feeds = result.tableData as unknown as Feed[];

    // Apply sorting if specified
    if (options.sort) {
      feeds = list_applySort(feeds, options.sort, options.reverse);
    }

    return {
      feeds,
      selectedFields: result.selectedFields || []
    };
  }
  return { feeds: [], selectedFields: [] };
}
