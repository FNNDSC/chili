/**
 * @file Copy command logic.
 *
 * @module
 */
import { files_copy, files_copyRecursively } from "@fnndsc/salsa";
import { path_resolveChrisFs } from "../../utils/cli.js";

export interface CpOptions {
  recursive?: boolean;
}

/**
 * Copies a file or directory.
 *
 * @param src - Source path.
 * @param dest - Destination path.
 * @param options - Copy options (recursive).
 * @returns Promise<boolean> success.
 */
export async function files_cp(src: string, dest: string, options: CpOptions): Promise<boolean> {
  const srcPath = await path_resolveChrisFs(src, {});
  const destPath = await path_resolveChrisFs(dest, {});

  if (options.recursive) {
    return await files_copyRecursively(srcPath, destPath);
  } else {
    return await files_copy(srcPath, destPath);
  }
}
