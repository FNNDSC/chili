import { plugins_list } from "@fnndsc/salsa";
import { FilteredResourceData } from "@fnndsc/cumin";
import { CLIoptions, options_toParams } from "../../utils/cli";

/**
 * Core logic for 'plugins list'.
 *
 * @param options - CLI options.
 * @returns Promise resolving to FilteredResourceData or null.
 */
export async function plugins_list_do(options: CLIoptions): Promise<FilteredResourceData | null> {
  const params = options_toParams(options);
  return await plugins_list(params);
}
