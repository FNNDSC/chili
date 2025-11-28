/**
 * @file View layer for Plugin commands.
 *
 * Provides output formatting for plugin listing, execution, and details.
 *
 * @module
 */
import { Plugin, PluginInstance } from '../models/plugin.js';
import chalk from 'chalk';

/**
 * Renders the result of a plugin execution.
 * @param instance - The created plugin instance.
 * @returns Formatted string.
 */
export function renderPluginRun(instance: PluginInstance): string {
  return chalk.green(`Plugin started successfully.\nInstance ID: ${chalk.bold(instance.id)}\nStatus: ${instance.status}`);
}

/**
 * Renders a list of plugins (simple view).
 * For complex tables, we might use console.table or `screen` module, but here we provide a string representation.
 */
export function renderPluginList(plugins: Plugin[]): string {
  if (plugins.length === 0) return chalk.gray("No plugins found.");
  
  // Simple list for now, can be expanded to table
  return plugins.map(p => `${chalk.cyan(p.name)} (v${p.version}) - ${chalk.gray(p.title || 'No title')}`).join('\n');
}
