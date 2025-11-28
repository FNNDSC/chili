/**
 * @file Models for raw ChRIS resources as returned by the API/Salsa.
 * 
 * These interfaces describe the shape of the data objects found in the `tableData`
 * arrays returned by Salsa's listing functions.
 *
 * @module
 */

/**
 * Base interface for any ChRIS resource.
 */
export interface ChrisResourceRaw {
  url?: string;
  id?: number;
  [key: string]: unknown;
}

/**
 * Represents a File, Directory, or Link from the ChRIS filesystem.
 * Note: Fields are optional because 'dirs', 'files', and 'links' endpoints
 * return slightly different subsets of these fields.
 */
export interface ChrisFileOrDirRaw extends ChrisResourceRaw {
  fname?: string;
  path?: string;
  fsize?: number;
  owner_username?: string;
  creation_date?: string;
}

/**
 * Represents a ChRIS Plugin.
 */
export interface ChrisPluginRaw extends ChrisResourceRaw {
  name: string;
  version: string;
  creation_date: string;
  title?: string;
  dock_image?: string;
  public_repo?: string;
}
