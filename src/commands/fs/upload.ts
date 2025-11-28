/**
 * @file Upload command implementation.
 * @module
 */
import { files_uploadPath } from "@fnndsc/salsa";
import { path_resolveChrisFs } from "../../utils/cli.js";

/**
 * Uploads a local file or directory to ChRIS.
 *
 * @param localPath - Local path.
 * @param remotePath - Remote ChRIS path.
 * @returns Promise<boolean> true if successful.
 */
export async function files_upload(localPath: string, remotePath: string): Promise<boolean> {
  // Resolve remote path context relative to current ChRIS CWD
  const resolvedRemote: string = await path_resolveChrisFs(remotePath, {});
  
  return await files_uploadPath(localPath, resolvedRemote);
}
