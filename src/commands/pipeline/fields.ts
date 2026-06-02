/**
 * @file Fetches available fields for pipeline resources.
 * @module
 */
import { pipelineFields_get } from '@fnndsc/salsa';

export async function pipelineFields_fetch(): Promise<string[] | null> {
  return await pipelineFields_get();
}
