/**
 * @file Implements the logic for displaying a system overview of ChRIS plugins.
 *
 * This module provides functionality to print a summary or overview
 * of the plugins available in the ChRIS system.
 *
 * @module
 */
import { plugins_overview as salsaPlugins_overview } from "@fnndsc/salsa";

/**
 * Displays an overview of registered plugins.
 *
 * @returns A Promise resolving to `void`.
 */
export async function pluginsOverview_display(): Promise<void> {
  return await salsaPlugins_overview();
}
