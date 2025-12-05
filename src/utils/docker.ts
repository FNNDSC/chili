/**
 * @file Docker utility functions.
 *
 * This module provides helper functions for interacting with the Docker CLI,
 * such as checking availability and running commands.
 *
 * @module
 */
import { exec } from "child_process";

/**
 * Promisified version of child_process.exec.
 * @param command - The command string to execute.
 * @returns A Promise that resolves with { stdout, stderr }.
 */
export async function childProcess_exec(command: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * Executes a shell command and returns its stdout.
 * @param command - The command to execute.
 * @returns The stdout of the command, or null if an error occurred.
 */
export async function shellCommand_run(command: string): Promise<string | null> {
  try {
    const { stdout, stderr } = await childProcess_exec(command);
    if (stderr) {
      // console.warn(`Command stderr: ${stderr.trim()}`); // Log stderr as warning, not necessarily an error
    }
    return stdout.trim();
  } catch (error: unknown) {
    // console.error(`Command failed: ${command}`);
    // console.error(`Error: ${error.message}`);
    return null;
  }
}

/**
 * Executes a shell command and returns detailed result including stderr.
 *
 * @param command - The command to execute.
 * @returns Object with stdout, stderr, and success status.
 */
export async function shellCommand_runWithDetails(command: string): Promise<{
  stdout: string;
  stderr: string;
  success: boolean;
  error?: string;
}> {
  try {
    const { stdout, stderr } = await childProcess_exec(command);
    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      success: true,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      stdout: '',
      stderr: '',
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Checks if Docker is installed and running.
 * @returns True if Docker is available, false otherwise.
 */
export async function docker_checkAvailability(): Promise<boolean> {
  // Use a simple docker command to check availability
  const result = await shellCommand_run("docker info > /dev/null 2>&1 && echo OK");
  if (result === "OK") {
    return true;
  }
  console.error("Error: Docker is not installed or not running.");
  console.error("Please ensure Docker is properly set up on your system to add plugins.");
  return false;
}

/**
 * Checks if a Docker image exists locally.
 *
 * @param image - The Docker image name/tag to check (e.g., 'fnndsc/pl-dircopy:2.1.1').
 * @returns Promise resolving to true if image exists locally, false otherwise.
 *
 * @example
 * ```typescript
 * const exists = await docker_imageExistsLocally('fnndsc/pl-dircopy:2.1.1');
 * if (!exists) {
 *   await docker_pullImage('fnndsc/pl-dircopy:2.1.1');
 * }
 * ```
 */
export async function docker_imageExistsLocally(image: string): Promise<boolean> {
  const result = await shellCommand_run(`docker images -q ${image} 2>/dev/null`);
  return result !== null && result.trim().length > 0;
}

/**
 * Pulls a Docker image from a registry.
 *
 * Checks if image exists locally first. If it exists, skips pull.
 * Output is suppressed for CLI use (use --quiet flag).
 *
 * @param image - The Docker image name/tag to pull.
 * @param quiet - Whether to suppress verbose output (default: true for CLI).
 * @returns Promise resolving to true if pull succeeded or image already exists, false otherwise.
 */
export async function docker_pullImage(image: string, quiet: boolean = true): Promise<boolean> {
  // Check if image exists locally first
  const existsLocally = await docker_imageExistsLocally(image);
  if (existsLocally) {
    console.log(`Docker image ${image} already exists locally.`);
    return true;
  }

  console.log(`Pulling Docker image: ${image}...`);
  const quietFlag = quiet ? '--quiet' : '';
  const result = await shellCommand_run(`docker pull ${quietFlag} ${image}`);

  if (result !== null) {
    console.log(`Successfully pulled ${image}`);
    return true;
  }

  console.error(`Failed to pull Docker image: ${image}`);
  return false;
}

/**
 * Gets the CMD directive from a Docker image.
 *
 * Inspects the Docker image configuration to extract the default command.
 * This is useful for running plugins that don't have chris_plugin_info.
 *
 * @param image - The Docker image name/tag.
 * @returns Promise resolving to array of command parts, or empty array if not found.
 *
 * @example
 * ```typescript
 * const cmd = await docker_getImageCmd('fnndsc/pl-civet:2.1.1.3');
 * // Returns: ['civet.py'] or similar
 * ```
 */
export async function docker_getImageCmd(image: string): Promise<string[]> {
  const result = await shellCommand_run(
    `docker inspect --format='{{json .Config.Cmd}}' ${image} 2>/dev/null`
  );

  if (!result || result.trim() === '' || result === 'null') {
    return [];
  }

  try {
    const cmd: string[] = JSON.parse(result) as string[];
    return Array.isArray(cmd) ? cmd : [];
  } catch {
    return [];
  }
}
