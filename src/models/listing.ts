/**
 * @file Models for file system listings.
 *
 * Defines the standardized "View Model" for items appearing in `ls` lists,
 * regardless of whether they are native files, directories, or virtual plugins.
 *
 * @module
 */

/**
 * Interface representing a rich file system item.
 * Contains all metadata required for various views (Grid, Long, JSON).
 */
export interface ListingItem {
  /** The display name of the item. */
  name: string;
  
  /** The type of the item. */
  type: 'dir' | 'file' | 'link' | 'plugin' | 'vfs';
  
  /** Size in bytes. */
  size: number;
  
  /** Username of the owner. */
  owner: string;
  
  /** Creation date (ISO string). */
  date: string;
  
  /** Target path (for links). */
  target?: string;

  /** Version string (for plugins). */
  version?: string;

  /** Title or description (for feeds, plugin instances). */
  title?: string;
}
