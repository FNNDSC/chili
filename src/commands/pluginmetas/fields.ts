/**
 * @file Fetches available fields for plugin meta resources.
 * @module
 */
import { pluginMetaFields_get } from '@fnndsc/salsa';

export async function pluginMetaFields_fetch(): Promise<string[] | null> {
  return await pluginMetaFields_get();
}
