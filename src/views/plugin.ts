/**
 * @file View layer for Plugin commands.
 *
 * Provides output formatting for plugin listing, execution, and details.
 *
 * @module
 */
import { Plugin, PluginInstance } from '../models/plugin.js';
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
 * Renders the result of a plugin execution.
 * @param instance - The created plugin instance.
 * @returns Formatted string.
 */
export function renderPluginRun(instance: PluginInstance): string {
  return chalk.green(`Plugin started successfully.\nInstance ID: ${chalk.bold(instance.id)}\nStatus: ${instance.status}`);
}

/**
 * Renders a list of plugins.
 * @param plugins - Array of Plugin objects.
 * @param selectedFields - The fields to display, in order.
 * @param options - Output options (e.g., table, csv).
 */
export function renderPluginList(plugins: Plugin[], selectedFields: string[], options: OutputOptions = {}): string {
  if (plugins.length === 0) return chalk.gray("No plugins found.");

  // Define default fields if none are specified or if the fields are empty
  const effectiveFields = selectedFields.length > 0 ? selectedFields : ['name', 'version', 'title'];

  const rows = plugins.map(p => {
    return effectiveFields.map(field => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let value = String((p as any)[field] || ''); // Access dynamically

      // Apply basic styling for key fields only in non-CSV/non-Table output
      if (!options.csv && !options.table) {
        if (field === 'id') return chalk.bold(value);
        if (field === 'name') return chalk.cyan(value);
      }
      return value;
    });
  });

  const headerForDisplay = effectiveFields.map(field => field.toUpperCase());

  if (options.csv) {
    // CSV format
    const csvHeader = headerForDisplay.map(h => `"${h}"`).join(',');
    const csvRows = rows.map(row => row.map(cell => `"${String(cell).split('"').join('""')}"`).join(',')).join('\n');
    return [csvHeader, csvRows].join('\n');
  } else if (options.table) {
    // Prepare data for screen.table_output
    const tableDataForScreen = plugins.map(plugin => {
      const row: Record<string, unknown> = {};
      effectiveFields.forEach(field => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        row[field] = (plugin as any)[field] || '';
      });
      return row;
    });

    // Pass original effectiveFields as head for correct data mapping, headerForDisplay for title
    return screen.table_output(tableDataForScreen, { head: effectiveFields, title: { title: "Plugins", justification: "center" } });

  } else {
    // Default list format (no header)
    return rows.map(row => row.join('\t')).join('\n');
  }
}
