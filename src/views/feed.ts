/**
 * @file View layer for Feed commands.
 *
 * Provides output formatting for feed listing and creation.
 *
 * @module
 */
import { Feed } from '../models/feed.js';
import chalk from 'chalk';
import { screen } from '../screen/screen.js';

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
      let value = String((f as any)[field] || ''); // Access dynamically
      
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
    const tableDataForScreen = feeds.map(feed => {
      const row: Record<string, any> = {};
      effectiveFields.forEach(field => {
        row[field] = (feed as any)[field] || '';
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
 * @param feed - The created feed.
 */
export function feedCreate_render(feed: Feed): string {
  return chalk.green(`Feed created successfully.\nID: ${feed.id}\nName: ${feed.name}`);
}
