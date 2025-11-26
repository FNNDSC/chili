/**
 * @file Implements the core logic for the `ls` command in the ChRIS CLI.
 *
 * This module provides functionality to list files, directories, and links
 * from a specified path within the ChRIS file system. It interacts with the
 * `@fnndsc/salsa` and `@fnndsc/cumin` libraries to fetch and filter resource data.
 *
 * @module
 */
import { files_getGroup } from "@fnndsc/salsa";
import { FilteredResourceData, ListOptions, params_fromOptions } from "@fnndsc/cumin";
import { path_resolveChrisFs } from "../../utils/cli.js";

export interface LsOptions {
  path?: string;
  [key: string]: string | undefined;
}

export interface ResourceItem {
  name: string;
  type: 'dir' | 'file' | 'link';
}

/**
 * Fetches resources from a specified group (dirs, files, or links) and pushes
 * them into a list of `ResourceItem`s.
 *
 * This helper function abstracts the logic for retrieving resource data
 * using `files_getGroup` and processing it into a standardized format.
 *
 * @param assetName - The type of asset to fetch ('dirs', 'files', or 'links').
 * @param path - The path within the ChRIS file system to fetch resources from.
 * @param items - The array to which the fetched `ResourceItem`s will be pushed.
 * @returns A Promise that resolves once the resources have been fetched and processed.
 */
async function resourceItems_fetchAndPush(
  assetName: 'dirs' | 'files' | 'links',
  path: string,
  items: ResourceItem[]
): Promise<void> {
  const group = await files_getGroup(assetName, path);
  if (group) {
    const params: ListOptions = params_fromOptions({ limit: 100, offset: 0 }); // Hardcoded limit for ls, can be an option
    
    // Explicitly type the expected structure of tableData items
    interface TableDataItem {
      fname?: string;
      path?: string;
      [key: string]: any; // Allow for other properties
    }

    const results: FilteredResourceData | null = await group.asset.resources_listAndFilterByOptions(params);
    if (results && results.tableData) {
       results.tableData.forEach((item: TableDataItem) => {
           let name: string = item.fname || item.path || "";
           if (name.includes('/')) {
               name = name.split('/').pop() || name;
           }
           
           let type: 'dir' | 'file' | 'link' = 'file';
           if (assetName === 'dirs') {
             type = 'dir';
           } else if (assetName === 'links') {
             type = 'link';
           }
           
           items.push({ name, type });
       });
    }
  }
}

/**
 * Core logic for the 'ls' command, returning structured data.
 * This function does not perform any console output.
 *
 * @param options - Options for the ls command, including path.
 * @param pathStr - The path to list. Defaults to an empty string if not provided.
 * @returns A Promise resolving to an array of ResourceItem, representing the listed files, directories, and links.
 */
export async function files_list(options: LsOptions, pathStr: string = ""): Promise<ResourceItem[]> {
  const items: ResourceItem[] = [];
  const resolvedPath = await path_resolveChrisFs(pathStr, {});
  
  await Promise.all([
      resourceItems_fetchAndPush('dirs', resolvedPath, items),
      resourceItems_fetchAndPush('files', resolvedPath, items),
      resourceItems_fetchAndPush('links', resolvedPath, items)
  ]);

  items.sort((a: ResourceItem, b: ResourceItem) => a.name.localeCompare(b.name));
  return items;
}