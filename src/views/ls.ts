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
}

/**
 * Formats bytes into human-readable string.
 */
export function formatSize(bytes: number): string {
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
function formatName(item: ListingItem): string {
  return fileSystemItem_colorize(item.name, item.type);
}

/**
 * Calculates the visible length of a string, stripping ANSI codes.
 */
function visibleLength(str: string): number {
  return str.replace(/\u001b\[[0-9;]*m/g, "").length;
}

/**
 * Renders the items in a multi-column grid format (standard `ls`).
 */
export function renderGrid(items: ListingItem[]): string {
  if (items.length === 0) return '';

  const formattedItems: string[] = items.map((item: ListingItem) => {
    let str: string = formatName(item);
    if (item.version) str += chalk.dim(` (${item.version})`);
    return str;
  });

  const termWidth: number = process.stdout.columns || 80;
  const padding: number = 2;
  
  const maxLen: number = Math.max(...formattedItems.map(visibleLength));
  const colWidth: number = maxLen + padding;
  const cols: number = Math.max(1, Math.floor(termWidth / colWidth));

  let output: string = "";
  for (let i: number = 0; i < formattedItems.length; i++) {
    const item: string = formattedItems[i];
    const visibleLen: number = visibleLength(item);
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
 */
export function renderLong(items: ListingItem[], options: ViewOptions = {}): string {
  if (items.length === 0) return '';

  return items.map((item: ListingItem) => {
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
      sizeStr = formatSize(item.size);
    }
    sizeStr = sizeStr.padEnd(8);

    // Date
    // Assuming date is ISO, just take the first 19 chars "YYYY-MM-DD HH:mm:ss"
    const dateStr: string = item.date.replace('T', ' ').slice(0, 19);

    // Name
    let nameStr: string = formatName(item);
    if (item.version) nameStr += ` (${item.version})`;

    let line: string = `${typeChar} ${owner} ${sizeStr} ${dateStr} ${nameStr}`;

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
export function renderJson(items: ListingItem[]): string {
  return JSON.stringify(items, null, 2);
}
