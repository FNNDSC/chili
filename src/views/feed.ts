/**
 * @file View layer for Feed commands.
 *
 * Provides output formatting for feed listing and creation.
 *
 * @module
 */
import { SimpleRecord } from '@fnndsc/cumin';
import { Feed } from '../models/feed.js';
import chalk from 'chalk';
import { screen } from '../screen/screen.js';
import type { FeedNote } from '../commands/feed/note.js';
import type { FeedComment } from '../commands/feed/comments.js';

/**
 * Options for rendering output.
 */
export interface OutputOptions {
  table?: boolean;
  csv?: boolean;
}

/**
 * Renders a list of feeds.
 * @param feeds - Array of Feed objects.
 * @param selectedFields - The fields to display, in order.
 * @param options - Output options (e.g., table, csv).
 */
export function feedList_render(feeds: Feed[], selectedFields: string[], options: OutputOptions = {}): string {
  if (feeds.length === 0) return chalk.gray("No feeds found.");
  
  // Define default fields if none are specified or if the fields are empty
  const effectiveFields = selectedFields.length > 0 ? selectedFields : ['id', 'name', 'creation_date', 'owner_username'];

  const rows = feeds.map(f => {
    return effectiveFields.map(field => {
      const fieldKey = field as keyof Feed;
      const rawValue = f[fieldKey];
      let value = rawValue !== undefined && rawValue !== null ? String(rawValue) : '';
      
      // Apply basic styling for key fields only in non-CSV/non-Table output
      if (!options.csv && !options.table) {
        if (field === 'id') return chalk.bold(value); 
        if (field === 'name') return chalk.cyan(value);
      }
      if (field === 'creation_date' && value.length > 19) return value.substring(0, 19); // Truncate ISO string
      return value;
    });
  });

  const headerForDisplay = effectiveFields.map(field => field.toUpperCase());

  if (options.csv) {
    // CSV format
    const csvHeader = headerForDisplay.map(h => `"${h}"`).join(',');
    const csvRows = rows.map(row => row.map(cell => `"${String(cell).split('"').join('""')}"`).join(',')).join('\n'); // Fixed CSV escaping
    return [csvHeader, csvRows].join('\n');
  } else if (options.table) {
    // Prepare data for screen.table_output
    interface FeedTableRow {
      [key: string]: string | number | boolean | null | undefined;
    }
    const tableDataForScreen: FeedTableRow[] = feeds.map(feed => {
      const row: FeedTableRow = {};
      effectiveFields.forEach(field => {
        const fieldKey = field as keyof Feed;
        const val = feed[fieldKey];
        row[field] = val !== undefined && val !== null ? (val as string | number | boolean) : '';
      });
      return row;
    });
    
    // Pass original effectiveFields as head for correct data mapping, headerForDisplay for title
    return screen.table_output(tableDataForScreen, { 
      head: effectiveFields, 
      title: { title: "Feeds", justification: "center" },
      typeColors: {
        string: "green",
        number: "yellow",
        boolean: "cyan",
        object: "magenta"
      }
    });

  } else {
    // Default list format (tab-separated)
    return rows.map(row => row.join('\t')).join('\n');
  }
}

/**
 * Renders the result of feed creation.
 * @param feedRecord - The created feed record (SimpleRecord).
 */
export function feedCreate_render(feedRecord: SimpleRecord): string {
  return chalk.green(`Feed created successfully.\nID: ${feedRecord.id}\nName: ${feedRecord.name}`);
}

/**
 * Renders a feed note.
 *
 * @param note - Note data.
 * @param feedId - Feed ID for context header.
 */
export function feedNote_render(note: FeedNote, feedId: number): string {
  const lines: string[] = [
    chalk.bold.cyan(`Note for feed ${feedId}`),
    chalk.gray('─'.repeat(40)),
  ];
  if (note.title) lines.push(`${chalk.bold('Title:')}   ${note.title}`);
  lines.push(`${chalk.bold('Content:')} ${note.content || chalk.gray('(empty)')}`);
  return lines.join('\n');
}

/**
 * Renders a list of feed comments.
 *
 * @param comments - Array of comments.
 * @param feedId - Feed ID for context header.
 */
export function feedComments_render(comments: FeedComment[], feedId: number): string {
  if (comments.length === 0) {
    return chalk.gray(`No comments on feed ${feedId}.`);
  }
  const lines: string[] = [
    chalk.bold.cyan(`Comments on feed ${feedId}`) + chalk.gray(` (${comments.length})`),
    chalk.gray('─'.repeat(50)),
  ];
  for (const c of comments) {
    lines.push(
      `${chalk.bold.gray(String(c.id).padStart(4))}  ` +
      `${chalk.cyan(c.owner_username.padEnd(16))}  ` +
      `${chalk.bold(c.title || chalk.gray('(no title)'))}`
    );
    if (c.content) lines.push(`      ${chalk.white(c.content)}`);
  }
  return lines.join('\n');
}
