/**
 * @file Implements the core logic for the `ls` command in the ChRIS CLI.
 *
 * This module provides functionality to list files, directories, and links
 * from a specified path within the ChRIS file system. It interacts with the
 * `@fnndsc/salsa` and `@fnndsc/cumin` libraries to fetch and filter resource data.
 *
 * @module
 */
import { files_listAll } from "@fnndsc/salsa";
import { path_resolveChrisFs } from "../../utils/cli.js";
import { ListingItem } from "../../models/listing.js";
import { ChrisFileOrDirRaw } from "../../models/resource.js";
import { list_applySort } from "../../utils/sort.js";
import { errorStack } from "@fnndsc/cumin";

export interface LsOptions {
  path?: string;
  sort?: string;
  reverse?: boolean;
  [key: string]: string | boolean | undefined;
}

/**
 * Core logic for the 'ls' command, returning structured data.
 *
 * @param options - Options for the ls command, including path.
 * @param pathStr - The path to list. Defaults to an empty string if not provided.
 * @returns A Promise resolving to an array of ListingItem.
 */
export async function files_list(options: LsOptions, pathStr: string = ""): Promise<ListingItem[]> {
  const items: ListingItem[] = [];
  
  // Resolve path against ChRIS FS
  // Note: If pathStr is invalid, this might throw, which is handled by caller
  const resolvedPath: string = await path_resolveChrisFs(pathStr, {});

  const fetchOpts: Record<string, string | number> = { limit: 100, offset: 0 }; // Starting options

  // Fetch all resources in parallel, but allow some to fail
  const results = await Promise.allSettled([
    files_listAll(fetchOpts, 'dirs', resolvedPath),
    files_listAll(fetchOpts, 'files', resolvedPath),
    files_listAll(fetchOpts, 'links', resolvedPath)
  ]);

  // Process results: 0=dirs, 1=files, 2=links
  const [dirsResult, filesResult, linksResult] = results;

  // Helper to map raw API objects to ListingItem
  const mapToItem = (raw: ChrisFileOrDirRaw, type: 'dir' | 'file' | 'link'): ListingItem => {
    // Extract name from fname or path
    let name: string = raw.fname || raw.path || "";
    if (name.includes('/')) {
        name = name.split('/').pop() || name;
    }

    // For links, strip the .chrislink extension from the display name
    if (type === 'link' && name.endsWith('.chrislink')) {
      name = name.slice(0, -10); // Remove '.chrislink' (10 characters)
    }

    // For links, prepend '/' to the target if it doesn't already have it
    let target: string | undefined = undefined;
    if (type === 'link' && raw.path) {
      target = raw.path.startsWith('/') ? raw.path : `/${raw.path}`;
    }

    return {
      name,
      type,
      size: raw.fsize || 0,
      owner: raw.owner_username || 'unknown',
      date: raw.creation_date || '',
      target
    };
  };

  // Handle directories
  if (dirsResult.status === 'fulfilled') {
    const dirs = dirsResult.value;
    if (dirs && dirs.tableData) {
      dirs.tableData.forEach((d: ChrisFileOrDirRaw) => items.push(mapToItem(d, 'dir')));
    }
  } else {
    errorStack.stack_push('error', `Failed to list directories: ${dirsResult.reason}`);
  }

  // Handle files
  if (filesResult.status === 'fulfilled') {
    const files = filesResult.value;
    if (files && files.tableData) {
      files.tableData.forEach((f: ChrisFileOrDirRaw) => items.push(mapToItem(f, 'file')));
    }
  } else {
    errorStack.stack_push('error', `Failed to list files: ${filesResult.reason}`);
  }

  // Handle links
  if (linksResult.status === 'fulfilled') {
    const links = linksResult.value;
    if (links && links.tableData) {
      links.tableData.forEach((l: ChrisFileOrDirRaw) => items.push(mapToItem(l, 'link')));
    }
  } else {
    errorStack.stack_push('error', `Failed to list links: ${linksResult.reason}`);
  }

  // Apply sorting (default to name if not specified)
  const sortField = options.sort || 'name';
  const sortedItems = list_applySort(items, sortField, options.reverse);

  return sortedItems;
}
