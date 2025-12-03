/**
 * @file Move command logic.
 *
 * Performs server-side moves (renames) for files and directories.
 *
 * @module
 */
import { files_move as salsa_files_move, files_listAll } from "@fnndsc/salsa";
import { path_resolveChrisFs } from "../../utils/cli.js";
import { errorStack, FilteredResourceData } from "@fnndsc/cumin";
import path from "path";

export interface MvOptions {
  // Reserved for future flags (e.g., force, interactive)
}

/**
 * Moves a file or directory.
 *
 * @param src - Source path.
 * @param dest - Destination path.
 * @returns Promise<boolean> success.
 */
export async function files_mv(src: string, dest: string): Promise<boolean> {
  const srcPath: string = await path_resolveChrisFs(src, {});
  const destPath: string = await path_resolveChrisFs(dest, {});

  const srcIsDir: boolean = await path_checkIsDir(srcPath);
  if (!srcIsDir && !(await path_checkExists(srcPath))) {
    errorStack.stack_push("error", `Source not found: ${src}`);
    return false;
  }

  const destIsDir: boolean = await path_checkIsDir(destPath);
  const destLooksDir: boolean = dest.endsWith("/");
  const finalDest: string = (destIsDir || destLooksDir)
    ? path.posix.join(destPath, path.posix.basename(srcPath))
    : destPath;

  return await salsa_files_move(srcPath, finalDest);
}

/**
 * Determines whether a given ChRIS path refers to a directory.
 *
 * @param targetPath - The absolute ChRIS path to check.
 * @returns Promise<boolean> indicating directory existence.
 */
async function path_checkIsDir(targetPath: string): Promise<boolean> {
  const parent: string = path.posix.dirname(targetPath);
  const results: FilteredResourceData | null = await files_listAll({ limit: 1000, offset: 0 }, "dirs", parent);

  if (!results || !results.tableData) {
    return false;
  }

  const name: string = path.posix.basename(targetPath);
  return results.tableData.some((entry: Record<string, unknown>) => {
    const candidate: string = typeof entry.path === "string" && entry.path.length > 0
      ? entry.path
      : typeof entry.fname === "string"
        ? entry.fname
        : "";

    return candidate === targetPath || path.posix.basename(candidate) === name;
  });
}

/**
 * Determines whether a given ChRIS path exists as a file in its parent directory.
 *
 * @param targetPath - The absolute ChRIS path to check.
 * @returns Promise<boolean> indicating file existence.
 */
async function path_checkExists(targetPath: string): Promise<boolean> {
  const parent: string = path.posix.dirname(targetPath);
  const name: string = path.posix.basename(targetPath);

  const results: FilteredResourceData | null = await files_listAll({ limit: 1000, offset: 0 }, "files", parent);
  if (!results || !results.tableData) {
    return false;
  }

  return results.tableData.some((entry: Record<string, unknown>) => {
    const candidate: string = typeof entry.fname === "string" ? entry.fname : "";
    return candidate === targetPath || path.posix.basename(candidate) === name;
  });
}
