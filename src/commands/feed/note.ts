/**
 * @file Feed note command logic.
 * @module
 */
import { feedNote_get, feedNote_update } from '@fnndsc/salsa';
import type { FeedNote } from '@fnndsc/salsa';
import { Result } from '@fnndsc/cumin';

export type { FeedNote };

/**
 * Fetches the note for a feed.
 *
 * @param feedId - Feed ID.
 * @returns Result containing note data.
 */
export async function feed_noteGet(feedId: number): Promise<Result<FeedNote>> {
  return feedNote_get(feedId);
}

/**
 * Updates the note for a feed.
 *
 * @param feedId - Feed ID.
 * @param data - Fields to update.
 * @returns Result containing true on success.
 */
export async function feed_noteUpdate(
  feedId: number,
  data: { title?: string; content?: string }
): Promise<Result<boolean>> {
  return feedNote_update(feedId, data);
}
