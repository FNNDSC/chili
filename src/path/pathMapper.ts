/**
 * @file Singleton path mapper for logical-to-physical ChRIS path resolution.
 *
 * Maintains a cached mapping of logical paths to physical locations,
 * enabling incremental resolution by reusing cached path prefixes.
 *
 * Example:
 *   - First call: '/home/user/public/feed_4' → Full resolution, cache prefix
 *   - Second call: '/home/user/public/feed_5' → Reuse '/home/user/public', resolve only 'feed_5'
 *
 * This eliminates redundant tree walking and API calls for paths with common prefixes.
 *
 * @module
 */

import { Result, Ok, Err, errorStack } from '@fnndsc/cumin';
import { files_listAll } from '@fnndsc/salsa';

/**
 * Cached mapping entry with TTL metadata.
 */
interface CachedMapping {
  physicalPath: string;
  timestamp: number;
  ttl: number;
}

/**
 * Statistics for cache performance monitoring.
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * Result of finding the longest cached prefix for a logical path.
 */
interface PrefixMatch {
  prefixLogical: string;
  prefixPhysical: string;
  suffix: string;
}

/**
 * Singleton PathMapper class for logical-to-physical path resolution.
 *
 * Maintains hierarchical cache of path mappings to minimize repeated
 * link resolution operations.
 *
 * @example
 * ```typescript
 * const mapper = PathMapper.instance_get();
 *
 * // First resolution
 * const result1 = await mapper.logical_toPhysical('/home/user/public/feed_4');
 * // → Resolves /home/user/public → /SHARED, then feed_4
 * // → Caches intermediate mappings
 *
 * // Second resolution - prefix reuse
 * const result2 = await mapper.logical_toPhysical('/home/user/public/feed_5');
 * // → Reuses cached '/home/user/public' → '/SHARED'
 * // → Resolves only 'feed_5'
 * ```
 */
export class PathMapper {
  private static instance: PathMapper | null = null;
  private cache: Map<string, CachedMapping> = new Map();
  private readonly defaultTTL: number = 30000; // 30 seconds
  private stats: { hits: number; misses: number } = { hits: 0, misses: 0 };

  /**
   * Private constructor enforces singleton pattern.
   */
  private constructor() {}

  /**
   * Gets the singleton PathMapper instance.
   *
   * @returns The singleton PathMapper instance.
   */
  static instance_get(): PathMapper {
    if (!PathMapper.instance) {
      PathMapper.instance = new PathMapper();
    }
    return PathMapper.instance;
  }

  /**
   * Resets the singleton instance (for testing).
   *
   * @internal
   */
  static instance_reset(): void {
    PathMapper.instance = null;
  }

  /**
   * Resolves a logical path to its physical location.
   *
   * Uses cached path prefixes when available, resolving only the
   * uncached suffix to minimize API calls.
   *
   * @param logicalPath - The logical path to resolve.
   * @returns Result containing the physical path, or Err on failure.
   *
   * @example
   * ```typescript
   * const mapper = PathMapper.instance_get();
   *
   * // First call: full resolution
   * const result1 = await mapper.logical_toPhysical('/home/user/public/feed_4');
   * // → Resolves /home/user/public → /SHARED, then feed_4
   * // → Caches: '/home/user/public' → '/SHARED'
   * // → Caches: '/home/user/public/feed_4' → '/SHARED/feed_4'
   *
   * // Second call: prefix reuse
   * const result2 = await mapper.logical_toPhysical('/home/user/public/feed_5');
   * // → Reuses cached '/home/user/public' → '/SHARED'
   * // → Resolves only 'feed_5'
   * ```
   */
  async logical_toPhysical(logicalPath: string): Promise<Result<string>> {
    // 1. Validate input
    if (!logicalPath || typeof logicalPath !== 'string') {
      errorStack.stack_push('error', 'Invalid path: path must be a non-empty string');
      return Err();
    }

    // 2. Normalize path
    const normalizedPath: string = logicalPath.startsWith('/')
      ? logicalPath
      : `/${logicalPath}`;

    // 3. Check exact cache hit
    const exactMatch: string | null = this.cache_get(normalizedPath);
    if (exactMatch !== null) {
      this.stats.hits++;
      return Ok(exactMatch);
    }

    // 4. Find longest cached prefix
    const prefixMatch: PrefixMatch = this.longestCachedPrefix_find(normalizedPath);

    // 5. Resolve suffix incrementally
    const resolvedPhysical: Result<string> = await this.suffix_resolve(
      prefixMatch.suffix,
      prefixMatch.prefixPhysical,
      prefixMatch.prefixLogical
    );

    if (!resolvedPhysical.ok) {
      this.stats.misses++;
      return Err();
    }

    // 6. Cache the full resolution
    this.cache_set(normalizedPath, resolvedPhysical.value);
    this.stats.misses++;

    return Ok(resolvedPhysical.value);
  }

  /**
   * Finds the longest cached prefix of a logical path.
   *
   * Walks up the path hierarchy to find the deepest cached mapping,
   * returning the cached physical prefix and remaining suffix.
   *
   * @param logicalPath - The full logical path.
   * @returns Object with cached prefix and remaining suffix.
   *
   * @example
   * ```typescript
   * // Cache contains: '/home/user/public' → '/SHARED'
   * const result = mapper.longestCachedPrefix_find('/home/user/public/feed_4/files');
   * // Returns:
   * // {
   * //   prefixLogical: '/home/user/public',
   * //   prefixPhysical: '/SHARED',
   * //   suffix: 'feed_4/files'
   * // }
   * ```
   */
  private longestCachedPrefix_find(logicalPath: string): PrefixMatch {
    const parts: string[] = logicalPath.split('/').filter((p: string) => p.length > 0);

    // Walk down from full path to root
    for (let i: number = parts.length; i >= 0; i--) {
      const candidatePrefix: string = i === 0
        ? '/'
        : '/' + parts.slice(0, i).join('/');

      const cached: string | null = this.cache_get(candidatePrefix);

      if (cached !== null) {
        const suffixParts: string[] = parts.slice(i);
        const suffix: string = suffixParts.join('/');

        return {
          prefixLogical: candidatePrefix,
          prefixPhysical: cached,
          suffix: suffix
        };
      }
    }

    // No cached prefix found, start from root
    return {
      prefixLogical: '/',
      prefixPhysical: '/',
      suffix: parts.join('/')
    };
  }

  /**
   * Resolves a path suffix by checking each component for links.
   *
   * Walks the suffix path, checking each component to see if it's a link.
   * Caches intermediate mappings along the way for future prefix reuse.
   *
   * @param suffix - The path suffix to resolve (e.g., 'feed_4/files').
   * @param physicalBase - The physical base path to build upon.
   * @param logicalBase - The logical base path (for caching intermediate results).
   * @returns Result containing the resolved physical path.
   */
  private async suffix_resolve(
    suffix: string,
    physicalBase: string,
    logicalBase: string
  ): Promise<Result<string>> {
    if (!suffix || suffix.length === 0) {
      return Ok(physicalBase);
    }

    const parts: string[] = suffix.split('/').filter((p: string) => p.length > 0);
    let physicalCurrent: string = physicalBase;
    let logicalCurrent: string = logicalBase;

    for (let i: number = 0; i < parts.length; i++) {
      const part: string = parts[i];

      // Build candidate paths
      const candidatePhysical: string = physicalCurrent === '/'
        ? `/${part}`
        : `${physicalCurrent}/${part}`;

      const candidateLogical: string = logicalCurrent === '/'
        ? `/${part}`
        : `${logicalCurrent}/${part}`;

      try {
        // Check if this component is a link
        const linkTarget: string | null = await this.link_checkAndResolve(candidatePhysical);

        if (linkTarget) {
          // It's a link! Jump to target
          physicalCurrent = linkTarget;
          logicalCurrent = candidateLogical;

          // Cache this intermediate mapping
          this.cache_set(candidateLogical, linkTarget);
        } else {
          // Not a link, continue building path
          physicalCurrent = candidatePhysical;
          logicalCurrent = candidateLogical;

          // Cache this intermediate mapping
          this.cache_set(candidateLogical, candidatePhysical);
        }
      } catch (error: unknown) {
        // Link resolution failed - log warning but continue
        const msg: string = error instanceof Error ? error.message : String(error);
        errorStack.stack_push(
          'warning',
          `Failed to check if '${candidatePhysical}' is a link: ${msg}. Treating as regular path.`
        );
        // Assume it's not a link and continue
        physicalCurrent = candidatePhysical;
        logicalCurrent = candidateLogical;
        this.cache_set(candidateLogical, candidatePhysical);
      }
    }

    return Ok(physicalCurrent);
  }

  /**
   * Checks if a path is a link and returns its target.
   *
   * Fetches link metadata from the parent directory and checks if the
   * candidate path matches any link entry.
   *
   * @param candidatePath - The path to check.
   * @returns The link target if it's a link, null otherwise.
   */
  private async link_checkAndResolve(candidatePath: string): Promise<string | null> {
    // Extract parent directory
    const parts: string[] = candidatePath.split('/');
    parts.pop(); // Remove filename
    const parentDir: string = parts.join('/') || '/';

    const normalizedCandidate: string = candidatePath.startsWith('/')
      ? candidatePath
      : `/${candidatePath}`;

    try {
      const fetchOpts: Record<string, string | number> = { limit: 1000, offset: 0 };
      const linksResult = await files_listAll(fetchOpts, 'links', parentDir);

      if (linksResult && linksResult.tableData) {
        for (const linkRaw of linksResult.tableData) {
          const linkFname: string = (linkRaw.fname as string) || '';
          const linkPath: string = (linkRaw.path as string) || '';

          const normalizedLinkFname: string = linkFname.startsWith('/')
            ? linkFname
            : `/${linkFname}`;

          if (normalizedLinkFname.endsWith('.chrislink')) {
            const logicalPath: string = normalizedLinkFname.slice(0, -10);

            if (logicalPath === normalizedCandidate) {
              const target: string = linkPath.startsWith('/') ? linkPath : `/${linkPath}`;
              return target;
            }
          }
        }
      }

      return null;
    } catch (error: unknown) {
      // Re-throw to be handled by caller
      throw error;
    }
  }

  /**
   * Gets a cached mapping if it exists and hasn't expired.
   *
   * @param logicalPath - The logical path to look up.
   * @returns The cached physical path, or null if not cached or expired.
   */
  private cache_get(logicalPath: string): string | null {
    const cached: CachedMapping | undefined = this.cache.get(logicalPath);

    if (!cached) {
      return null;
    }

    const now: number = Date.now();
    const age: number = now - cached.timestamp;

    if (age > cached.ttl) {
      // Expired, remove from cache
      this.cache.delete(logicalPath);
      return null;
    }

    return cached.physicalPath;
  }

  /**
   * Caches a logical-to-physical path mapping.
   *
   * @param logicalPath - The logical path.
   * @param physicalPath - The corresponding physical path.
   * @param ttl - Optional TTL in milliseconds (defaults to 30s).
   */
  private cache_set(
    logicalPath: string,
    physicalPath: string,
    ttl: number = this.defaultTTL
  ): void {
    this.cache.set(logicalPath, {
      physicalPath,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Invalidates all cached mappings with a given logical path prefix.
   *
   * Call this when links are created/deleted/modified.
   *
   * @param logicalPathPrefix - The logical path prefix to invalidate.
   *
   * @example
   * ```typescript
   * // Link changed: /home/user/public → /SHARED becomes → /PUBLIC
   * mapper.cache_invalidate('/home/user/public');
   * // Invalidates:
   * //   - /home/user/public
   * //   - /home/user/public/feed_4
   * //   - /home/user/public/feed_5
   * //   - ... etc
   * ```
   */
  cache_invalidate(logicalPathPrefix: string): void {
    const keysToDelete: string[] = [];

    for (const [key] of this.cache) {
      if (key === logicalPathPrefix || key.startsWith(logicalPathPrefix + '/')) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Clears all cached mappings.
   */
  cache_clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Gets cache statistics.
   *
   * @returns Cache statistics including hit rate and size.
   */
  stats_get(): CacheStats {
    const total: number = this.stats.hits + this.stats.misses;
    const hitRate: number = total === 0 ? 0 : this.stats.hits / total;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate
    };
  }
}

/**
 * Convenience function to get the singleton PathMapper instance.
 *
 * @returns The singleton PathMapper instance.
 */
export function pathMapper_get(): PathMapper {
  return PathMapper.instance_get();
}
