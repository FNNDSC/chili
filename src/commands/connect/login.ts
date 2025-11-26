/**
 * @file Implements the logic for logging into the ChRIS backend.
 *
 * This module provides functionality to authenticate the user
 * with a ChRIS instance.
 *
 * @module
 */
import { connect_do as salsaConnect_do, ConnectOptions } from "@fnndsc/salsa";

/**
 * Handles the login process.
 *
 * @param options - Connection options (url, username, password).
 * @returns A Promise resolving to `void`.
 */
export async function connect_login(options: ConnectOptions): Promise<void> {
  try {
    await salsaConnect_do(options);
  } catch (error) {
    console.error("Failed to connect:", error);
  }
}
