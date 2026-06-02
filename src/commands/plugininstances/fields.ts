/**
 * @file Fetches available fields for plugin instance resources.
 * @module
 */
import { pluginInstanceFields_get } from '@fnndsc/salsa';

export async function pluginInstanceFields_fetch(): Promise<string[] | null> {
  return await pluginInstanceFields_get();
}
