/**
 * @file Implements listing ChRIS plugin metas.
 * @module
 */
import { pluginMetas_list as salsaPluginMetas_list, pluginMetas_listAll as salsaPluginMetas_listAll } from '@fnndsc/salsa';
import { FilteredResourceData } from '@fnndsc/cumin';
import { CLIoptions, options_toParams } from '../../utils/cli.js';
import { list_applySort } from '../../utils/sort.js';

export interface PluginMetaListResult {
  pluginMetas: Record<string, unknown>[];
  selectedFields: string[];
}

export async function pluginMetas_fetchList(options: CLIoptions): Promise<PluginMetaListResult> {
  const params = options_toParams(options);
  const result: FilteredResourceData | null = options.all
    ? await salsaPluginMetas_listAll(params)
    : await salsaPluginMetas_list(params);

  if (result && result.tableData) {
    let pluginMetas = result.tableData as Record<string, unknown>[];
    if (options.sort) pluginMetas = list_applySort(pluginMetas, options.sort, options.reverse);
    return { pluginMetas, selectedFields: result.selectedFields || [] };
  }
  return { pluginMetas: [], selectedFields: [] };
}
