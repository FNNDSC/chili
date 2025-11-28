/**
 * @file Models for Plugin operations.
 *
 * Defines the data structures for Plugins and Plugin Instances (execution results).
 *
 * @module
 */
import { ChrisPluginRaw } from './resource.js';

/**
 * Represents a ChRIS Plugin.
 * Extends the raw resource definition with any view-specific needs.
 */
export interface Plugin extends ChrisPluginRaw {
  // Computed fields can be added here if needed for views
}

/**
 * Represents a running or completed Plugin Instance.
 */
export interface PluginInstance {
  id: number;
  title: string;
  status: string;
  plugin_name?: string;
  start_date?: string;
  end_date?: string;
  [key: string]: unknown;
}
