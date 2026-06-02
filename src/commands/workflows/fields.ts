/**
 * @file Fetches available fields for workflow resources.
 * @module
 */
import { workflowFields_get } from '@fnndsc/salsa';

export async function workflowFields_fetch(): Promise<string[] | null> {
  return await workflowFields_get();
}
