import { files_getGroup } from "@fnndsc/salsa";
import { FilteredResourceData, options_toParams } from "@fnndsc/cumin";

export interface LsOptions {
  path?: string;
  [key: string]: any;
}

export interface ResourceItem {
  name: string;
  type: 'dir' | 'file' | 'link';
}

/**
 * Helper to get resources from a group and push to list.
 */
async function resources_fetch_do(
  assetName: string,
  path: string,
  items: ResourceItem[]
) {
  const group = await files_getGroup(assetName, path);
  if (group) {
    const params = options_toParams({ limit: 100, offset: 0 }); // Hardcoded limit for ls, can be an option
    
    const results: FilteredResourceData | null = await group.asset.resources_listAndFilterByOptions(params);
    if (results && results.tableData) {
       results.tableData.forEach(item => {
           let name = item.fname || item.path || "";
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
 * @param pathStr - The path to list.
 * @returns A Promise resolving to an array of ResourceItem.
 */
export async function files_ls_do(options: LsOptions, pathStr: string = ""): Promise<ResourceItem[]> {
  const items: ResourceItem[] = [];
  
  await Promise.all([
      resources_fetch_do('dirs', pathStr, items),
      resources_fetch_do('files', pathStr, items),
      resources_fetch_do('links', pathStr, items)
  ]);

  items.sort((a, b) => a.name.localeCompare(b.name));
  return items;
}
