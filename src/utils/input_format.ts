/**
 * @file Input Format Detection
 *
 * Utilities for detecting the format of plugin input strings (name, Docker image, or store URL).
 * Used by plugin_add to determine the appropriate registration strategy.
 *
 * @module
 */

/**
 * Plugin input format types.
 */
import readline from "readline";

export enum PluginInputFormat {
  PLUGIN_NAME = 'plugin_name',
  DOCKER_IMAGE = 'docker_image',
  STORE_URL = 'store_url',
}

/**
 * Interface describing the detected input format.
 */
export interface DetectedFormat {
  format: PluginInputFormat;
  value: string;
  pluginName?: string;  // Extracted plugin name (for docker images)
  version?: string;     // Extracted version (for docker images)
}

/**
 * Detects the format of a plugin input string.
 *
 * Determines whether the input is:
 * - A store URL (starts with http:// or https://)
 * - A Docker image (contains / or :)
 * - A plugin name (everything else)
 *
 * @param input - The plugin input string to analyze.
 * @returns DetectedFormat object describing the input type.
 *
 * @example
 * ```typescript
 * input_detectFormat('pl-dircopy')
 * // { format: 'plugin_name', value: 'pl-dircopy' }
 *
 * input_detectFormat('fnndsc/pl-dircopy:2.1.1')
 * // { format: 'docker_image', value: 'fnndsc/pl-dircopy:2.1.1', pluginName: 'pl-dircopy', version: '2.1.1' }
 *
 * input_detectFormat('https://cube.chrisproject.org/api/v1/plugins/96/')
 * // { format: 'store_url', value: 'https://...' }
 * ```
 */
export function input_detectFormat(input: string): DetectedFormat {
  const trimmedInput: string = input.trim();

  // Check if it's a URL (store URL)
  if (trimmedInput.startsWith('http://') || trimmedInput.startsWith('https://')) {
    return {
      format: PluginInputFormat.STORE_URL,
      value: trimmedInput,
    };
  }

  // Check if it's a Docker image (contains / or :)
  if (trimmedInput.includes('/') || trimmedInput.includes(':')) {
    const { name, version } = pluginNameAndVersion_extractFromImage(trimmedInput);
    return {
      format: PluginInputFormat.DOCKER_IMAGE,
      value: trimmedInput,
      pluginName: name,
      version: version
    };
  }

  // Otherwise, it's a plugin name
  // Check if it includes version (e.g. pl-dircopy-v2.1.1)
  if (trimmedInput.includes('-v')) {
    const lastVIndex = trimmedInput.lastIndexOf('-v');
    const name = trimmedInput.substring(0, lastVIndex);
    const version = trimmedInput.substring(lastVIndex + 2); // +2 for '-v'
    
    return {
      format: PluginInputFormat.PLUGIN_NAME,
      value: name, // Use name without version as value? 
                   // Or keep original? Usually value is used for search.
                   // plugin_add uses detected.value as search term if pluginName is missing.
                   // But we supply pluginName now.
                   // Let's keep value as trimmedInput to be safe, but provide pluginName/version.
      pluginName: name,
      version: version
    };
  }

  return {
    format: PluginInputFormat.PLUGIN_NAME,
    value: trimmedInput,
  };
}

/**
 * Extracts a plugin name and version from a Docker image string.
 *
 * Examples:
 *   'fnndsc/pl-dircopy:2.1.1' -> { name: 'pl-dircopy', version: '2.1.1' }
 *   'fnndsc/pl-dircopy' -> { name: 'pl-dircopy', version: undefined }
 *   'pl-dircopy:latest' -> { name: 'pl-dircopy', version: 'latest' }
 *
 * @param dockerImage - Docker image string.
 * @returns Object containing extracted plugin name and optional version.
 */
export function pluginNameAndVersion_extractFromImage(dockerImage: string): { name: string; version?: string } {
  // Split by / to get the last part (repository/image)
  const parts: string[] = dockerImage.split('/');
  const lastPart: string = parts[parts.length - 1];

  const nameParts: string[] = lastPart.split(':');
  const name: string = nameParts[0];
  const version: string | undefined = nameParts.length > 1 ? nameParts[1] : undefined;

  return { name, version };
}

/**
 * Backward-compatible helper to extract only the plugin name from a Docker image.
 *
 * @param dockerImage - Docker image string.
 * @returns The extracted plugin name.
 */
export function pluginName_extractFromImage(dockerImage: string): string {
  const { name } = pluginNameAndVersion_extractFromImage(dockerImage);
  return name;
}

/**
 * Prompts the user for confirmation. Throws if declined or if prompt cannot be shown (non-TTY) without force.
 *
 * @param message - The confirmation message to display.
 */
export async function prompt_confirmOrThrow(message: string): Promise<void> {
  if (!process.stdout.isTTY) {
    throw new Error(`${message} Use --force to skip confirmation.`);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (q: string): Promise<string> =>
    new Promise((resolve) => rl.question(q, resolve));

  const answer: string = (await question(`${message} `)).trim().toLowerCase();
  rl.close();

  if (answer !== "y" && answer !== "yes") {
    throw new Error("Operation cancelled by user.");
  }
}
