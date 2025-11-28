/**
 * @file Models for Feed operations.
 *
 * Defines the data structures for ChRIS Feeds.
 *
 * @module
 */

/**
 * Represents a ChRIS Feed.
 */
export interface Feed {
  id: number;
  name: string;
  creation_date: string;
  modification_date: string;
  owner_username?: string;
  [key: string]: unknown; // Allow extra fields
}
