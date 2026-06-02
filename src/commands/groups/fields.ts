/**
 * @file Fetches available fields for group resources.
 * @module
 */
import { groupFields_get } from '@fnndsc/salsa';

export async function groupFields_fetch(): Promise<string[] | null> {
  return await groupFields_get();
}
