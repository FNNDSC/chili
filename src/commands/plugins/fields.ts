import { plugins_fields_get } from "@fnndsc/salsa";

/**
 * Core logic for 'plugins fieldslist'.
 *
 * @returns Promise resolving to string[] of fields or null.
 */
export async function plugins_fieldsGet(): Promise<string[] | null> {
  return await plugins_fields_get();
}
