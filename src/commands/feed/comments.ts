/**
 * @file Feed comments command logic.
 * @module
 */
import {
  feedComments_list,
  feedComment_create,
  feedComment_delete,
  feedComment_update,
} from '@fnndsc/salsa';
import type { FeedComment } from '@fnndsc/salsa';
import { Result } from '@fnndsc/cumin';

export type { FeedComment };

export async function feed_commentsList(feedId: number): Promise<Result<FeedComment[]>> {
  return feedComments_list(feedId);
}

export async function feed_commentCreate(
  feedId: number,
  data: { title?: string; content?: string }
): Promise<Result<FeedComment>> {
  return feedComment_create(feedId, data);
}

export async function feed_commentDelete(feedId: number, commentId: number): Promise<Result<boolean>> {
  return feedComment_delete(feedId, commentId);
}

export async function feed_commentUpdate(
  feedId: number,
  commentId: number,
  data: { title?: string; content?: string }
): Promise<Result<boolean>> {
  return feedComment_update(feedId, commentId, data);
}
