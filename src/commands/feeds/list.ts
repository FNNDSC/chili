import { feeds_list } from "@fnndsc/salsa";
import { FilteredResourceData } from "@fnndsc/cumin";
import { CLIoptions, options_toParams } from "../../utils/cli";

/**
 * Core logic for 'feeds list'.
 *
 * @param options - CLI options.
 * @returns Promise resolving to FilteredResourceData or null.
 */
export async function feeds_list_do(options: CLIoptions): Promise<FilteredResourceData | null> {
  const params = options_toParams(options);
  return await feeds_list(params);
}
