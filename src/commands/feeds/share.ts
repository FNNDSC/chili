/**
 * @file Implements the logic for sharing ChRIS feeds.
 *
 * This module provides functionality to share a specific feed
 * with other users using the `@fnndsc/salsa` library.
 *
 * @module
 */
import { feeds_share as salsaFeeds_share, FeedShareOptions } from "@fnndsc/salsa";

/**
 * Shares a feed with other users.
 *
 * @param feedId - The ID of the feed to share.
 * @param options - Sharing options (e.g., list of users).
 * @returns A Promise resolving to `true` on success, `false` otherwise.
 */
export async function feed_shareById(feedId: number, options: FeedShareOptions): Promise<boolean> {
  return await salsaFeeds_share(feedId, options);
}
