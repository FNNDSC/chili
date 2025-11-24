import { plugins_overview } from "@fnndsc/salsa";

/**
 * Core logic for 'plugins overview'.
 *
 * @returns Promise resolving to void.
 */
export async function plugins_doOverview(): Promise<void> {
  return await plugins_overview();
}
