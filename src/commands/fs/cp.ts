/**
 * @file Copy command logic.
 *
 * @module
 */
import { vfsDispatcher } from "@fnndsc/salsa";
import { errorStack } from "@fnndsc/cumin";

/**
 * Options for the copy operation.
 */
export interface CpOptions {
  /** Recursively copy directories. */
  recursive?: boolean;
}

/**
 * Copies a file or directory.
 * Delegates the operation directly to the centralized vfsDispatcher.
 *
 * @param src - Source path.
 * @param dest - Destination path.
 * @param options - Copy options (recursive).
 * @returns Promise<boolean> success.
 */
export async function files_cp(src: string, dest: string, options: CpOptions): Promise<boolean> {
  try {
    return await vfsDispatcher.cp(src, dest, options);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    errorStack.stack_push("error", `cp command failed: ${msg}`);
    return false;
  }
}
