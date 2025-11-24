import { feeds_share, FeedShareOptions } from "@fnndsc/salsa";

/**
 * Core logic for 'feeds share'.
 *
 * @param feedId - The ID of the feed to share.
 * @param options - Sharing options.
 * @returns Promise resolving to true on success, false otherwise.
 */
export async function feeds_doShare(feedId: number, options: FeedShareOptions): Promise<boolean> {
  return await feeds_share(feedId, options);
}
