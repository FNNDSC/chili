/**
 * @file Admin Credential Prompting
 *
 * Utilities for prompting users for admin credentials when required for plugin
 * registration operations. Supports both interactive prompting and flag-based
 * credential provision.
 *
 * @module
 */

import * as readline from 'readline';
import { Writable } from 'stream';

/**
 * Interface for admin credentials.
 */
export interface AdminCredentials {
  username: string;
  password: string;
}

/** Injected by the host (chell) so prompts route through the active readline. */
let _askFn: ((prompt: string) => Promise<string>) | null = null;
let _askHiddenFn: ((prompt: string) => Promise<string>) | null = null;

/**
 * Registers question functions from the active REPL.
 * Called by chell's plugin builtin before invoking plugin_add.
 *
 * @param askFn - Visible-input question function.
 * @param askHiddenFn - Hidden-input (password) question function.
 */
export function adminPrompt_register(
  askFn: (prompt: string) => Promise<string>,
  askHiddenFn: (prompt: string) => Promise<string>
): void {
  _askFn = askFn;
  _askHiddenFn = askHiddenFn;
}

/**
 * Prompts the user for admin credentials interactively.
 *
 * Uses injected REPL question functions when available so the REPL's
 * readline interface is not duplicated on stdin.
 *
 * @param attempt - Current attempt number (for retry logic).
 * @param maxAttempts - Maximum number of attempts allowed.
 * @returns Promise resolving to admin credentials, or null if user cancels.
 */
export async function adminCredentials_prompt(
  attempt: number = 1,
  maxAttempts: number = 3
): Promise<AdminCredentials | null> {
  if (attempt === 1) {
    console.log('\nAdmin credentials required to register plugins.');
    console.log('You can provide these via --adminUser and --adminPassword flags.');
    console.log('');
  } else {
    console.log(`\nAuthentication failed. Attempt ${attempt} of ${maxAttempts}.`);
    console.log('');
  }

  const askFn: (prompt: string) => Promise<string> = _askFn ?? ask_fallback;
  const askHiddenFn: (prompt: string) => Promise<string> = _askHiddenFn ?? askHidden_fallback;

  const username: string = await askFn('Username: ');
  if (!username) {
    console.log('Username cannot be empty.');
    return null;
  }

  const password: string = await askHiddenFn('Password: ');
  if (!password) {
    console.log('Password cannot be empty.');
    return null;
  }

  return { username, password };
}

/**
 * Fallback visible-input prompt (used outside the REPL).
 */
function ask_fallback(prompt: string): Promise<string> {
  return new Promise((resolve: (v: string) => void) => {
    const rl: readline.Interface = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, (answer: string) => { rl.close(); resolve(answer.trim()); });
  });
}

/**
 * Fallback hidden-input prompt (used outside the REPL).
 */
function askHidden_fallback(prompt: string): Promise<string> {
  return new Promise((resolve: (v: string) => void) => {
    const muted: Writable = new Writable({
      write(_chunk: unknown, _enc: unknown, cb: () => void) { cb(); }
    });
    const rl: readline.Interface = readline.createInterface({
      input: process.stdin,
      output: muted,
      terminal: true,
    });
    process.stdout.write(prompt);
    rl.question('', (answer: string) => {
      process.stdout.write('\n');
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Validates admin credentials by checking if they are non-empty.
 *
 * @param credentials - Admin credentials to validate.
 * @returns True if credentials are valid, false otherwise.
 */
export function adminCredentials_validate(credentials: AdminCredentials | null): boolean {
  if (!credentials) {
    return false;
  }
  return credentials.username.trim().length > 0 &&
         credentials.password.trim().length > 0;
}
