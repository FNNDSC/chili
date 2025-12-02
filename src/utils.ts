/**
 * @file Utils exports for chili
 *
 * This file exports utility functions without triggering the main CLI.
 * Used by other packages like chell to import utilities.
 *
 * @module
 */

export { logical_toPhysical } from './utils/cli.js';
export { PathMapper, pathMapper_get } from './path/pathMapper.js';
export type { CacheStats } from './path/pathMapper.js';
