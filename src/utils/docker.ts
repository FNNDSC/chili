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
    exec(command, (error, stdout, stderr) => {
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
