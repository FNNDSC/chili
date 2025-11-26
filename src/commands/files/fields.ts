/**
 * @file Implements the logic for retrieving available fields for ChRIS file resources.
 *
 * This module provides functionality to fetch the list of valid fields
 * that can be displayed or queried for files, directories, or links.
 *
 * @module
 */
import { fileFields_get as salsaFileFields_get } from "@fnndsc/salsa";

/**
 * Fetches the list of available fields for a given asset type.
 *
 * @param assetName - The asset name ('files', 'links', 'dirs'). Defaults to 'files'.
 * @returns A Promise resolving to an array of field names, or `null` if retrieval fails.
 */
export async function fileFields_fetch(assetName: string = "files"): Promise<string[] | null> {
  return await salsaFileFields_get(assetName);
}
