/**
 * @file View layer for the `ls` command.
 *
 * Provides different rendering strategies for file listing data:
 * - Grid: Multi-column standard view.
 * - Long: Detailed list with metadata (-l).
 * - JSON: Raw structured data.
 *
 * @module
 */
import chalk from 'chalk';
import { ListingItem } from '../models/listing.js';
import { fileSystemItem_colorize } from '../config/colorConfig.js';

/**
 * Options for the view renderers.
 */
export interface ViewOptions {
  human?: boolean; // Human-readable sizes
  // Note: sort and reverse are now handled at the command layer
  // These are kept for backwards compatibility but should not be used
  sort?: 'name' | 'size' | 'date' | 'owner'; // DEPRECATED: Sort at command layer instead
  reverse?: boolean; // DEPRECATED: Sort at command layer instead
}

/**
 * Formats bytes into human-readable string.
 */
export function size_format(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k: number = 1024;
  const sizes: string[] = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i: number = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Formats a resource item name based on its type (color coding).
 * Uses color configuration from cumin.
 */
function name_format(item: ListingItem): string {
  return fileSystemItem_colorize(item.name, item.type);
}

/**
 * Calculates the visible length of a string, stripping ANSI codes.
 */
function string_lengthVisible(str: string): number {
  return str.replace(/\u001b\[[0-9;]*m/g, "").length;
}

/**
 * DEPRECATED: Sorts an array of listing items based on specified criteria.
 * @deprecated Sorting should be done at the command layer, not in views.
 * @param items - Array of items to sort.
 * @param sortBy - Field to sort by (default: 'name').
 * @param reverse - Whether to reverse the sort order.
 * @returns Sorted array of items.
 */
export function items_sort(
  items: ListingItem[],
  sortBy: 'name' | 'size' | 'date' | 'owner' = 'name',
  reverse: boolean = false
): ListingItem[] {
  const sorted = [...items].sort((a: ListingItem, b: ListingItem) => {
    let comparison: number = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'date':
        comparison = a.date.localeCompare(b.date);
        break;
      case 'owner':
        comparison = a.owner.localeCompare(b.owner);
        break;
    }

    return reverse ? -comparison : comparison;
  });

  return sorted;
}

/**
 * Renders the items in a multi-column grid format (standard `ls`).
 * Note: Items should already be sorted at the command layer.
 */
export function grid_render(items: ListingItem[], options: ViewOptions = {}): string {
  if (items.length === 0) return '';

  // Legacy sorting support (deprecated - sort at command layer instead)
  let displayItems = items;
  if (options.sort) {
    const sortBy = options.sort;
    const reverse = options.reverse || false;
    displayItems = items_sort(items, sortBy, reverse);
  }

  const formattedItems: string[] = displayItems.map((item: ListingItem) => {
    let str: string = name_format(item);
    if (item.version) str += chalk.dim(` (${item.version})`);
    return str;
  });

  const termWidth: number = process.stdout.columns || 80;
  const padding: number = 2;

  const maxLen: number = Math.max(...formattedItems.map(string_lengthVisible));
  const colWidth: number = maxLen + padding;
  const cols: number = Math.max(1, Math.floor(termWidth / colWidth));

  let output: string = "";
  for (let i: number = 0; i < formattedItems.length; i++) {
    const item: string = formattedItems[i];
    const visibleLen: number = string_lengthVisible(item);
    const padLen: number = colWidth - visibleLen;
    
    output += item + " ".repeat(padLen);
    
    if ((i + 1) % cols === 0) {
      output += "\n";
    }
  }
  
  return output.trimEnd(); // Trim trailing newline
}

/**
 * Renders the items in a long list format (`ls -l`).
 * Note: Items should already be sorted at the command layer.
 */
export function long_render(items: ListingItem[], options: ViewOptions = {}): string {
  if (items.length === 0) return '';

  // Legacy sorting support (deprecated - sort at command layer instead)
  let displayItems: ListingItem[] = items;
  if (options.sort) {
    const sortBy: 'name' | 'size' | 'date' | 'owner' = options.sort;
    const reverse: boolean = options.reverse || false;
    displayItems = items_sort(items, sortBy, reverse);
  }

  // Calculate max name width for alignment
  const maxNameWidth: number = Math.max(
    ...displayItems.map((item: ListingItem) => {
      const nameStr: string = name_format(item);
      const visibleLen: number = string_lengthVisible(nameStr);
      return item.version ? visibleLen + item.version.length + 3 : visibleLen;
    })
  );

  return displayItems.map((item: ListingItem) => {
    // Type
    let typeChar: string = '-';
    if (item.type === 'dir') typeChar = 'd';
    else if (item.type === 'link') typeChar = 'l';
    else if (item.type === 'plugin') typeChar = 'p';
    else if (item.type === 'vfs') typeChar = 'v';

    // Owner
    const owner: string = item.owner.padEnd(10);

    // Size
    let sizeStr: string = item.size.toString();
    if (options.human) {
      sizeStr = size_format(item.size);
    }
    sizeStr = sizeStr.padEnd(8);

    // Date
    // Assuming date is ISO, just take the first 19 chars "YYYY-MM-DD HH:mm:ss"
    const dateStr: string = item.date.replace('T', ' ').slice(0, 19);

    // Name
    let nameStr: string = name_format(item);
    if (item.version) nameStr += ` (${item.version})`;

    // Pad name to max width for alignment
    const nameVisibleLen: number = string_lengthVisible(nameStr);
    const namePadding: string = ' '.repeat(Math.max(0, maxNameWidth - nameVisibleLen));

    let line: string = `${typeChar} ${owner} ${sizeStr} ${dateStr} ${nameStr}${namePadding}`;

    // Title (for feeds, plugin instances)
    if (item.title) {
      line += `    ${chalk.greenBright(item.title)}`;
    }

    // Link Target
    if (item.type === 'link' && item.target) {
      line += ` -> ${item.target}`;
    }

    return line;
  }).join('\n');
}

/**
 * Renders the items as a JSON string.
 */
export function json_render(items: ListingItem[]): string {
  return JSON.stringify(items, null, 2);
}
