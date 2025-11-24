import { files_fields_get } from "@fnndsc/salsa";

/**
 * Core logic for 'files fieldslist'.
 *
 * @param assetName - The asset name ('files', 'links', 'dirs').
 * @returns Promise resolving to string[] of fields or null.
 */
export async function files_fields_do(assetName: string = "files"): Promise<string[] | null> {
  return await files_fields_get(assetName);
}
