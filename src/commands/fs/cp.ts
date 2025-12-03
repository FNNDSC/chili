/**
 * @file Copy command logic.
 *
 * @module
 */
import { files_copy, files_copyRecursively } from "@fnndsc/salsa";
import { path_resolveChrisFs } from "../../utils/cli.js";
import { files_listAll } from "@fnndsc/salsa";
import { errorStack } from "@fnndsc/cumin";
import path from "path";

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
  const srcPath: string = await path_resolveChrisFs(src, {});
  const destPath: string = await path_resolveChrisFs(dest, {});

  const srcIsDir: boolean = await path_checkIsDir(srcPath);
  if (srcIsDir && !options.recursive) {
    errorStack.stack_push("error", `Source is a directory. Re-run with --recursive to copy: ${src}`);
    return false;
  }

  const destIsDir: boolean = await path_checkIsDir(destPath);
  const destLooksDir: boolean = dest.endsWith("/");
  const finalDest: string = (destIsDir || destLooksDir)
    ? path.posix.join(destPath, path.posix.basename(srcPath))
    : destPath;

  if (options.recursive) {
    return await files_copyRecursively(srcPath, finalDest);
  } else {
    return await files_copy(srcPath, finalDest);
  }
}

/**
 * Determines whether a given ChRIS path refers to a directory.
 *
 * @param targetPath - The absolute ChRIS path to check.
 * @returns Promise<boolean> indicating directory existence.
 */
async function path_checkIsDir(targetPath: string): Promise<boolean> {
  const parent: string = path.posix.dirname(targetPath);
  const name: string = path.posix.basename(targetPath);
  const results = await files_listAll({ limit: 1000, offset: 0 }, "dirs", parent);

  if (!results || !results.tableData) {
    return false;
  }

  return results.tableData.some((entry: Record<string, unknown>) => {
    const candidate: string = typeof entry.path === "string" && entry.path.length > 0
      ? entry.path
      : typeof entry.fname === "string"
        ? entry.fname
        : "";

    return candidate === targetPath || path.posix.basename(candidate) === name;
  });
}
