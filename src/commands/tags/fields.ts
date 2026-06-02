/**
 * @file Fetches available fields for tag resources.
 * @module
 */
import { tagFields_get } from '@fnndsc/salsa';

export async function tagFields_fetch(): Promise<string[] | null> {
  return await tagFields_get();
}
