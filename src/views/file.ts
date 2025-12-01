/**
 * @file View layer for File commands.
 *
 * Provides output formatting for file listing (files, dirs, links).
 *
 * @module
 */
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
 * Represents a file resource item.
 */
export interface FileResource {
  id?: number;
  fname?: string;
  fsize?: number;
  owner_username?: string;
  creation_date?: string;
  [key: string]: any;
}

/**
 * Renders a list of files.
 * @param files - Array of file resource objects.
 * @param selectedFields - The fields to display, in order.
 * @param options - Output options (e.g., table, csv).
 */
export function fileList_render(
  files: FileResource[],
  selectedFields: string[],
  options: OutputOptions = {}
): string {
  if (files.length === 0) return chalk.gray("No files found.");

  // Define default fields if none are specified or if the fields are empty
  const effectiveFields = selectedFields.length > 0
    ? selectedFields
    : ['id', 'fname', 'fsize', 'owner_username', 'creation_date'];

  const rows = files.map(f => {
    return effectiveFields.map(field => {
      let value = String((f as any)[field] || '');

      // Apply basic styling for key fields only in non-CSV/non-Table output
      if (!options.csv && !options.table) {
        if (field === 'id') return chalk.bold(value);
        if (field === 'fname') return chalk.cyan(value);
      }
      if (field === 'creation_date' && value.length > 19) return value.substring(0, 19);
      return value;
    });
  });

  const headerForDisplay = effectiveFields.map(field => field.toUpperCase());

  if (options.csv) {
    // CSV format
    const csvHeader = headerForDisplay.map(h => `"${h}"`).join(',');
    const csvRows = rows.map(row =>
      row.map(cell => `"${String(cell).split('"').join('""')}"`).join(',')
    ).join('\n');
    return [csvHeader, csvRows].join('\n');
  } else if (options.table) {
    // Prepare data for screen.table_output
    const tableDataForScreen = files.map(file => {
      const row: Record<string, any> = {};
      effectiveFields.forEach(field => {
        row[field] = (file as any)[field] || '';
      });
      return row;
    });

    return screen.table_output(tableDataForScreen, {
      head: effectiveFields,
      title: { title: "Files", justification: "center" },
      typeColors: {
        string: "green",
        number: "yellow",
        boolean: "cyan",
        object: "magenta"
      }
    });

  } else {
    // Default list format (no header)
    return rows.map(row => row.join('\t')).join('\n');
  }
}
