/**
 * @file Store commands.
 *
 * Commands for interacting with the peer ChRIS store.
 *
 * @module
 */
import { store_list, store_search } from '@fnndsc/salsa';
import { ListingItem } from '../../models/listing.js';
import { CLIoptions } from '../../utils/cli.js';

export interface StoreOptions extends CLIoptions {
  store?: string;
}

/**
 * Maps raw store plugin data to ListingItem model.
 */
function mapToStoreItem(plugin: Record<string, unknown>): ListingItem {
  const name = (plugin.name as string) || 'unknown';
  const version = (plugin.version as string) || '';
  
  // Format name as name-vVersion to match chell's ls /bin style
  // This ensures consistent colorization (green name, dim green version)
  const displayName = version ? `${name}-v${version}` : name;

  return {
    name: displayName,
    type: 'plugin', // This ensures green color
    size: 0,
    owner: (plugin.authors as string) || 'store',
    date: (plugin.creation_date as string) || '',
    // Set version to undefined to prevent grid_render from appending " (version)"
    version: undefined 
  };
}

/**
 * Lists plugins from the store.
 *
 * @param options - CLI options.
 * @returns Promise resolving to ListingItem array.
 */
export async function store_listPlugins(options: StoreOptions): Promise<ListingItem[]> {
  const plugins = await store_list(options.store);
  return plugins.map(mapToStoreItem);
}

/**
 * Searches plugins in the store.
 *
 * @param query - Search query.
 * @param options - CLI options.
 * @returns Promise resolving to ListingItem array.
 */
export async function store_searchPlugins(query: string, options: StoreOptions): Promise<ListingItem[]> {
  const plugins = await store_search(query, options.store);
  return plugins.map(mapToStoreItem);
}
