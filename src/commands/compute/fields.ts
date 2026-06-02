/**
 * @file Fetches available fields for compute resources.
 * @module
 */
import { computeResourceFields_get } from '@fnndsc/salsa';

export async function computeFields_fetch(): Promise<string[] | null> {
  return await computeResourceFields_get();
}
