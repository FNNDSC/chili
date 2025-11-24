import { feeds_fields_get } from "@fnndsc/salsa";

/**
 * Core logic for 'feeds fieldslist'.
 *
 * @returns Promise resolving to string[] of fields or null.
 */
export async function feeds_fieldsGet(): Promise<string[] | null> {
  return await feeds_fields_get();
}
