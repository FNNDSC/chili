/**
 * @file Implements compute resource listing for ChRIS CUBE.
 *
 * @module
 */
import { computeResources_getAll, ComputeResource } from '@fnndsc/cumin';

/**
 * Result structure for compute resource listing.
 */
export interface ComputeListResult {
  resources: ComputeResource[];
  selectedFields: string[];
}

/**
 * Fetches all available compute resources from ChRIS CUBE.
 *
 * @returns Promise resolving to ComputeListResult.
 */
export async function computeResources_fetchList(): Promise<ComputeListResult> {
  const result = await computeResources_getAll();
  if (!result.ok) return { resources: [], selectedFields: [] };
  return {
    resources: result.value,
    selectedFields: ['id', 'name', 'compute_url', 'description'],
  };
}
