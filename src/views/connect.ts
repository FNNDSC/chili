/**
 * @file View layer for connection commands.
 *
 * Provides standard output formatting for login/logout operations.
 *
 * @module
 */
import chalk from 'chalk';

/**
 * Renders the result of a login attempt.
 * @param success - Whether the connection was successful.
 * @param url - The URL connected to.
 * @param user - The user logged in as.
 * @param token - The auth token received (optional, usually not displayed in full).
 */
export function renderLogin(success: boolean, url: string, user: string, token?: string): string {
  if (success) {
    return chalk.green(`Successfully connected to ${url} as ${user}.`);
  } else {
    return chalk.red(`Failed to connect to ${url} as ${user}.`);
  }
}

/**
 * Renders the result of a logout attempt.
 * @param success - Whether the logout was successful.
 */
export function renderLogout(success: boolean): string {
  if (success) {
    return chalk.green('Logged out from ChRIS.');
  } else {
    return chalk.red('Logout failed.');
  }
}
