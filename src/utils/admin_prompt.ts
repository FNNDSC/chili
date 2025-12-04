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

/**
 * Interface for admin credentials.
 */
export interface AdminCredentials {
  username: string;
  password: string;
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
 *
 * @example
 * ```typescript
 * const creds = await adminCredentials_prompt(1, 3);
 * if (creds) {
 *   // Use credentials
 * }
 * ```
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

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // Prompt for username
    const username: string = await new Promise((resolve) => {
      rl.question('Username: ', (answer) => {
        resolve(answer.trim());
      });
    });

    if (!username) {
      console.log('Username cannot be empty.');
      rl.close();
      return null;
    }

    // Prompt for password (hidden input)
    const password: string = await promptPassword_hidden(rl);

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
 * Prompts for password input with hidden display.
 *
 * Uses raw mode to hide password characters as they are typed.
 *
 * @param rl - Readline interface instance.
 * @returns Promise resolving to the entered password.
 */
async function promptPassword_hidden(rl: readline.Interface): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write('Password: ');

    // Set stdin to raw mode to hide input
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();

    let password = '';

    const onData = (char: Buffer) => {
      const charStr = char.toString();

      switch (charStr) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          // Enter pressed, finish input
          stdin.setRawMode(wasRaw);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(password);
          break;

        case '\u0003': // Ctrl+C
          // Cancel
          stdin.setRawMode(wasRaw);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve('');
          break;

        case '\u007f': // Backspace
        case '\b':     // Backspace (some terminals)
          if (password.length > 0) {
            password = password.slice(0, -1);
            // Clear the character visually
            process.stdout.write('\b \b');
          }
          break;

        default:
          // Add character to password
          password += charStr;
          process.stdout.write('*'); // Show asterisk for each character
          break;
      }
    };

    stdin.on('data', onData);
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
