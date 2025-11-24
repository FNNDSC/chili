import { files_list } from "@fnndsc/salsa";
import { FilteredResourceData } from "@fnndsc/cumin";
import { CLIoptions, options_toParams } from "../../utils/cli";

/**
 * Core logic for 'files list', 'links list', 'dirs list'.
 *
 * @param options - CLI options.
 * @param assetName - The type of asset to list ('files', 'links', 'dirs').
 * @param path - Optional ChRIS path.
 * @returns Promise resolving to FilteredResourceData or null.
 */
export async function files_list_do(options: CLIoptions, assetName: string = "files", path?: string): Promise<FilteredResourceData | null> {
  const params = options_toParams(options);
  return await files_list(params, assetName, path);
}
