/**
 * @file Color Configuration Loader
 *
 * Loads and manages color scheme configuration for file system types
 * from the colors.yml configuration file.
 *
 * @module
 */
import yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

/**
 * Interface for color style configuration.
 */
export interface ColorStyle {
  color: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  inverse?: boolean;
  strikethrough?: boolean;
}

/**
 * Interface for the complete color configuration.
 */
export interface ColorConfig {
  fileTypes: {
    dir: ColorStyle;
    file: ColorStyle;
    link: ColorStyle;
    plugin: ColorStyle;
    vfs: ColorStyle;
  };
  specialPaths: {
    [path: string]: ColorStyle;
  };
}

let cachedConfig: ColorConfig | null = null;

/**
 * Loads the color configuration from colors.yml.
 *
 * @returns The parsed color configuration.
 */
function colorConfig_load(): ColorConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  // Use import.meta.url for ESM (chili is built as ESM)
  const __filename: string = fileURLToPath(import.meta.url);
  const __dirname: string = path.dirname(__filename);
  const configPath: string = path.resolve(__dirname, '../../config/colors.yml');

  try {
    const fileContents: string = fs.readFileSync(configPath, 'utf8');
    cachedConfig = yaml.load(fileContents) as ColorConfig;
    return cachedConfig;
  } catch (e: unknown) {
    const msg: string = e instanceof Error ? e.message : String(e);
    console.error(`Warning: Could not load color config: ${msg}`);

    // Return default configuration
    return {
      fileTypes: {
        dir: { color: 'cyan', bold: true },
        file: { color: 'white', bold: false },
        link: { color: 'magenta', bold: false },
        plugin: { color: 'green', bold: true },
        vfs: { color: 'cyanBright', bold: true }
      },
      specialPaths: {
        '/bin': { color: 'cyan', bold: true },
        '~': { color: 'blue', bold: false }
      }
    };
  }
}

/**
 * Applies color style to text using chalk.
 *
 * @param text - The text to colorize.
 * @param style - The color style configuration.
 * @returns The colorized text.
 */
function colorStyle_apply(text: string, style: ColorStyle): string {
  let styledText: string = text;

  // Apply color
  if (style.color && (chalk as any)[style.color]) {
    styledText = (chalk as any)[style.color](styledText);
  }

  // Apply modifiers
  if (style.bold) styledText = chalk.bold(styledText);
  if (style.dim) styledText = chalk.dim(styledText);
  if (style.italic) styledText = chalk.italic(styledText);
  if (style.underline) styledText = chalk.underline(styledText);
  if (style.inverse) styledText = chalk.inverse(styledText);
  if (style.strikethrough) styledText = chalk.strikethrough(styledText);

  return styledText;
}

/**
 * Gets the colorized text for a file system item based on its type.
 *
 * @param name - The name of the item.
 * @param type - The type of the item ('dir', 'file', 'link', 'plugin', 'vfs').
 * @param fullPath - Optional full path for special path handling.
 * @returns The colorized name.
 */
export function fileSystemItem_colorize(
  name: string,
  type: 'dir' | 'file' | 'link' | 'plugin' | 'vfs',
  fullPath?: string
): string {
  const config: ColorConfig = colorConfig_load();

  // Check for special path styling first
  if (fullPath && config.specialPaths[fullPath]) {
    return colorStyle_apply(name, config.specialPaths[fullPath]);
  }

  // Apply file type styling
  const style: ColorStyle = config.fileTypes[type];
  return colorStyle_apply(name, style);
}

/**
 * Gets the color configuration.
 *
 * @returns The current color configuration.
 */
export function colorConfig_get(): ColorConfig {
  return colorConfig_load();
}
