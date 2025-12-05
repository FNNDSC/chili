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

/**
 * Extended Writable stream with muted property for password input.
 */
interface MutableWritable extends Writable {
  muted?: boolean;
}

/**
 * Prompts the user for admin credentials interactively.
 *
 * Displays verbose explanatory text suitable for interactive shell use.
 * Password input is hidden from terminal display.
 *
 * @param attempt - Current attempt number (for retry logic).
 * @param maxAttempts - Maximum number of attempts allowed.
 * @returns Promise resolving to admin credentials, or null if user cancels.
 */
export async function adminCredentials_prompt(
  attempt: number = 1,
  maxAttempts: number = 3
): Promise<AdminCredentials | null> {
  // Display verbose explanatory message (for interactive use)
  if (attempt === 1) {
    console.log('\nAdmin credentials required to register plugins.');
    console.log('You can provide these via --adminUser and --adminPassword flags.');
    console.log('');
  } else {
    console.log(`\nAuthentication failed. Attempt ${attempt} of ${maxAttempts}.`);
    console.log('');
  }

  const mutableStdout: MutableWritable = new Writable({
    write: function(chunk, encoding, callback) {
      if (!(this as MutableWritable).muted)
        process.stdout.write(chunk, encoding);
      callback();
    }
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: mutableStdout,
    terminal: true
  });

  try {
    mutableStdout.muted = false;
    const username: string = await new Promise((resolve) => {
      rl.question('Username: ', (answer: string) => {
        resolve(answer.trim());
      });
    });

    if (!username) {
      console.log('Username cannot be empty.');
      rl.close();
      return null;
    }

    mutableStdout.muted = true;
    process.stdout.write('Password: ');
    const password: string = await new Promise((resolve) => {
      rl.question('', (answer: string) => {
        process.stdout.write('\n'); // Newline after hidden input
        resolve(answer.trim());
      });
    });

    if (!password) {
      console.log('Password cannot be empty.');
      rl.close();
      return null;
    }

    rl.close();
    return { username, password };
  } catch (error) {
    rl.close();
    console.error('\nPrompt cancelled or error occurred.');
    return null;
  }
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
