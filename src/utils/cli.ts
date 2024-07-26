import { ListOptions } from '@fnndsc/cumin';  
import { applySearchParams } from '@fnndsc/cumin';

export interface CLIoptions {
  page?: string;
  fields?: string;
  search?: string;
  [key: string]: any;
}

export function optionsToParams(options: CLIoptions): ListOptions {
  const baseParams: ListOptions = {
    limit: options.page ? parseInt(options.page, 10) : 20,
    offset: 0,
    name: undefined,
    fields: options.fields,
  };

  return applySearchParams(baseParams, options.search);
}