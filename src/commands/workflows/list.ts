/**
 * @file Implements listing ChRIS workflows.
 * @module
 */
import { workflows_list as salsaWorkflows_list, workflows_listAll as salsaWorkflows_listAll } from '@fnndsc/salsa';
import { FilteredResourceData } from '@fnndsc/cumin';
import { CLIoptions, options_toParams } from '../../utils/cli.js';
import { list_applySort } from '../../utils/sort.js';

export interface WorkflowListResult {
  workflows: Record<string, unknown>[];
  selectedFields: string[];
}

export async function workflows_fetchList(options: CLIoptions): Promise<WorkflowListResult> {
  const params = options_toParams(options);
  const result: FilteredResourceData | null = options.all
    ? await salsaWorkflows_listAll(params)
    : await salsaWorkflows_list(params);

  if (result && result.tableData) {
    let workflows = result.tableData as Record<string, unknown>[];
    if (options.sort) workflows = list_applySort(workflows, options.sort, options.reverse);
    return { workflows, selectedFields: result.selectedFields || [] };
  }
  return { workflows: [], selectedFields: [] };
}
