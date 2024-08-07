import { ListOptions } from "@fnndsc/cumin";
import { applyKeyPairParams } from "@fnndsc/cumin";

export interface CLIoptions {
  page?: string;
  fields?: string;
  search?: string;
  params?: string;
  [key: string]: any;
}

export function optionsToParams(
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
    return applyKeyPairParams(baseParams, keyPairValue);
  }

  return baseParams;
}
