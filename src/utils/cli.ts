import { ListOptions } from "@fnndsc/cumin";
import { keyPairParams_apply } from "@fnndsc/cumin";

export interface CLIoptions {
  page?: string;
  fields?: string;
  search?: string;
  params?: string;
  [key: string]: any;
}

export function options_toParams(
  options: CLIoptions,
  keyPairField: keyof CLIoptions = "search"
): ListOptions {
  const baseParams: ListOptions = {
    limit: options.page ? parseInt(options.page, 10) : 20,
    offset: 0,
    fields: options.fields,
  };

  const keyPairValue = options[keyPairField];

  if (typeof keyPairValue === "string") {
    return keyPairParams_apply(baseParams, keyPairValue);
  }

  return baseParams;
}
