/**
 * @file Implements listing ChRIS groups.
 * @module
 */
import { groups_list as salsaGroups_list, groups_listAll as salsaGroups_listAll } from '@fnndsc/salsa';
import { FilteredResourceData } from '@fnndsc/cumin';
import { CLIoptions, options_toParams } from '../../utils/cli.js';
import { list_applySort } from '../../utils/sort.js';

export interface GroupListResult {
  groups: Record<string, unknown>[];
  selectedFields: string[];
  totalCount?: number;
}

export async function groups_fetchList(options: CLIoptions): Promise<GroupListResult> {
  const params = options_toParams(options);
  const result: FilteredResourceData | null = options.all
    ? await salsaGroups_listAll(params)
    : await salsaGroups_list(params);

  if (result && result.tableData) {
    let groups = result.tableData as Record<string, unknown>[];
    if (options.sort) groups = list_applySort(groups, options.sort, options.reverse);
    return { groups, selectedFields: result.selectedFields || [], totalCount: result.totalCount };
  }
  return { groups: [], selectedFields: [] };
}
