/**
 * @file Implements listing ChRIS plugin instances (jobs).
 * @module
 */
import { pluginInstances_list as salsaPluginInstances_list, pluginInstances_listAll as salsaPluginInstances_listAll } from '@fnndsc/salsa';
import { FilteredResourceData } from '@fnndsc/cumin';
import { CLIoptions, options_toParams } from '../../utils/cli.js';
import { list_applySort } from '../../utils/sort.js';

export interface PluginInstanceListResult {
  pluginInstances: Record<string, unknown>[];
  selectedFields: string[];
  totalCount?: number;
}

export async function pluginInstances_fetchList(options: CLIoptions): Promise<PluginInstanceListResult> {
  const params = options_toParams(options);
  const result: FilteredResourceData | null = options.all
    ? await salsaPluginInstances_listAll(params)
    : await salsaPluginInstances_list(params);

  if (result && result.tableData) {
    let pluginInstances = result.tableData as Record<string, unknown>[];
    if (options.sort) pluginInstances = list_applySort(pluginInstances, options.sort, options.reverse);
    return { pluginInstances, selectedFields: result.selectedFields || [], totalCount: result.totalCount };
  }
  return { pluginInstances: [], selectedFields: [] };
}
