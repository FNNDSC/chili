/**
 * @file Implements the logic for retrieving available fields for ChRIS feeds.
 *
 * This module provides functionality to fetch the list of valid fields
 * that can be displayed or queried for feeds.
 *
 * @module
 */
import { feedFields_get as salsaFeedFields_get } from "@fnndsc/salsa";

/**
 * Fetches the list of available fields for feeds.
 *
 * @returns A Promise resolving to an array of field names, or `null` if retrieval fails.
 */
export async function feedFields_fetch(): Promise<string[] | null> {
  return await salsaFeedFields_get();
}
