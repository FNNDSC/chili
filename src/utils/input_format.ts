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
 * // { format: 'docker_image', value: 'fnndsc/pl-dircopy:2.1.1', pluginName: 'pl-dircopy' }
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
    return {
      format: PluginInputFormat.DOCKER_IMAGE,
      value: trimmedInput,
      pluginName: pluginName_extractFromImage(trimmedInput),
    };
  }

  // Otherwise, it's a plugin name
  return {
    format: PluginInputFormat.PLUGIN_NAME,
    value: trimmedInput,
  };
}

/**
 * Extracts a plugin name from a Docker image string.
 *
 * Examples:
 *   'fnndsc/pl-dircopy:2.1.1' -> 'pl-dircopy'
 *   'pl-dircopy:latest' -> 'pl-dircopy'
 *   'localhost:5000/pl-custom' -> 'pl-custom'
 *
 * @param dockerImage - Docker image string.
 * @returns Extracted plugin name.
 */
export function pluginName_extractFromImage(dockerImage: string): string {
  // Split by / to get the last part (repository/image)
  const parts: string[] = dockerImage.split('/');
  const lastPart: string = parts[parts.length - 1];

  // Remove tag (everything after :)
  const nameWithoutTag: string = lastPart.split(':')[0];

  return nameWithoutTag;
}
