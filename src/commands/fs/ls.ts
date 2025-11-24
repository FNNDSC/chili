import { files_getGroup } from "@fnndsc/salsa";
import { FilteredResourceData, ListOptions, params_fromOptions } from "@fnndsc/cumin";

export interface LsOptions {
  path?: string;
  [key: string]: string | undefined;
}

export interface ResourceItem {
  name: string;
  type: 'dir' | 'file' | 'link';
}

/**
 * Helper to get resources from a group and push to list.
 */
async function resources_fetch(
  assetName: string,
  path: string,
  items: ResourceItem[]
): Promise<void> {
  const group = await files_getGroup(assetName, path);
  if (group) {
    const params: ListOptions = params_fromOptions({ limit: 100, offset: 0 }); // Hardcoded limit for ls, can be an option
    
    const results: FilteredResourceData | null = await group.asset.resources_listAndFilterByOptions(params);
    if (results && results.tableData) {
       results.tableData.forEach((item: Record<string, any>) => {
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
 * @param pathStr - The path to list.
 * @returns A Promise resolving to an array of ResourceItem.
 */
export async function files_ls(options: LsOptions, pathStr: string = ""): Promise<ResourceItem[]> {
  const items: ResourceItem[] = [];
  
  await Promise.all([
      resources_fetch('dirs', pathStr, items),
      resources_fetch('files', pathStr, items),
      resources_fetch('links', pathStr, items)
  ]);

  items.sort((a: ResourceItem, b: ResourceItem) => a.name.localeCompare(b.name));
  return items;
}
