/**
 * @file Implements the logic for logging out from the ChRIS backend.
 *
 * This module provides functionality to clear the user's authentication session.
 *
 * @module
 */
import { logout_do as salsaLogout_do } from "@fnndsc/salsa";

/**
 * Handles the logout process.
 *
 * @returns A Promise resolving to `void`.
 */
export async function connect_logout(): Promise<void> {
  await salsaLogout_do();
}
