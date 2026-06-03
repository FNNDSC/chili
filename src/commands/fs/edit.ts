/**
 * @file File edit-in-place: delete original + re-upload modified content.
 * @module
 */
import { files_rm, RmResult } from './rm.js';
import { files_upload } from './upload.js';

export interface EditResult {
  success: boolean;
  error?: string;
}

/**
 * Replaces a ChRIS file in-place by deleting the original and uploading
 * a new version from a local path.
 *
 * @param chrisPath - The resolved ChRIS path of the file to replace.
 * @param localPath - The local temp file containing the new content.
 * @returns EditResult indicating success or failure with error message.
 */
export async function file_replaceContent(
  chrisPath: string,
  localPath: string
): Promise<EditResult> {
  const rmResult: RmResult = await files_rm(chrisPath, { recursive: false, force: false });
  if (!rmResult.success) {
    return { success: false, error: rmResult.error ?? 'Delete failed' };
  }
  const uploaded: boolean = await files_upload(localPath, chrisPath);
  return {
    success: uploaded,
    error: uploaded ? undefined : 'Upload failed after delete — original is gone, check tmp file',
  };
}
