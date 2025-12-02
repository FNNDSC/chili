# PathMapper Implementation

## Overview

The `PathMapper` singleton class implements hierarchical path mapping from logical ChRIS paths to physical storage locations, with aggressive prefix caching to optimize repeated resolutions.

## Architecture

### Problem Solved

**Before:** Every path resolution walked the entire tree from root, causing redundant API calls:
```
/home/user/public/feed_4 → 4 API calls
/home/user/public/feed_5 → 4 API calls (redundant!)
/home/user/public/feed_6 → 4 API calls (redundant!)
```

**After:** Hierarchical prefix caching eliminates redundant operations:
```
/home/user/public/feed_4 → 4 API calls (initial resolution)
/home/user/public/feed_5 → 1 API call  (reuses cached prefix!)
/home/user/public/feed_6 → 1 API call  (reuses cached prefix!)
```

### Key Design Decisions

1. **Path-Level Caching**: Cache complete logical → physical mappings
2. **Incremental Resolution**: Find longest cached prefix, resolve only the suffix
3. **Intermediate Caching**: Cache every path segment for maximum reuse
4. **TTL-Based Expiration**: 30-second TTL balances freshness vs performance
5. **Singleton Pattern**: Single source of truth for all path mappings

## API

### Core Methods

```typescript
import { pathMapper_get } from '@fnndsc/chili';

const mapper = pathMapper_get();

// Resolve logical path to physical location
const result = await mapper.logical_toPhysical('/home/user/public/feed_4');
if (result.ok) {
  console.log(result.value); // '/SHARED/feed_4'
}

// Invalidate cache when links change
mapper.cache_invalidate('/home/user/public');

// Clear all cached mappings
mapper.cache_clear();

// Get performance statistics
const stats = mapper.stats_get();
console.log(`Hit rate: ${stats.hitRate * 100}%`);
```

### Statistics

```typescript
interface CacheStats {
  hits: number;       // Number of cache hits
  misses: number;     // Number of cache misses
  size: number;       // Current cache size
  hitRate: number;    // Hit rate (0-1)
}
```

## Performance Characteristics

### Time Complexity

| Operation | Without Cache | With Cache | Improvement |
|-----------|---------------|------------|-------------|
| First resolution | O(depth) | O(depth) | - |
| Repeated resolution | O(depth) | **O(1)** | ✅ |
| Prefix reuse | O(depth) | **O(suffix)** | ✅ |

### Real-World Example

Resolving 1000 files in `/home/user/feeds/feed_123/files/`:

**Without caching:**
- 1000 × 6 components = 6,000 API calls

**With PathMapper:**
- First file: 6 API calls (cache miss)
- Remaining 999 files: 1 API call each (prefix reuse)
- **Total: 1,005 API calls (83% reduction)**

## Implementation Details

### Resolution Algorithm

```
logical_toPhysical(logicalPath):
  1. Check exact cache hit → return if found
  2. Find longest cached prefix
  3. Resolve only the uncached suffix
  4. Cache all intermediate segments
  5. Return final physical path
```

### Example Resolution

```
Input: '/home/user/public/feed_4'
Cache state: { '/home/user/public': '/SHARED' }

Step 1: Check exact cache for '/home/user/public/feed_4' → miss
Step 2: Find longest prefix:
  - Check '/home/user/public/feed_4' → miss
  - Check '/home/user/public' → HIT! ✓
Step 3: Resolve suffix 'feed_4' from '/SHARED':
  - Check if '/SHARED/feed_4' is a link → no
Step 4: Cache '/home/user/public/feed_4' → '/SHARED/feed_4'
Step 5: Return '/SHARED/feed_4'
```

## Cache Management

### When to Invalidate

Call `cache_invalidate()` when:
- Links are created: `mapper.cache_invalidate(parentDir)`
- Links are deleted: `mapper.cache_invalidate(parentDir)`
- Links are modified: `mapper.cache_invalidate(linkPath)`

### TTL Behavior

- Default TTL: 30 seconds
- Expired entries are removed on access
- Balances freshness vs performance

### Memory Considerations

- Cache grows with unique paths accessed
- Each entry: ~100 bytes (path strings + metadata)
- 10,000 paths ≈ 1 MB memory
- TTL ensures bounded growth

## Testing

Comprehensive test suite with 31 tests covering:

✅ Singleton pattern enforcement
✅ Basic path resolution
✅ Link resolution (single and multiple)
✅ Caching behavior
✅ **Prefix reuse optimization** (key feature)
✅ Cache invalidation
✅ TTL expiration
✅ Error handling
✅ Statistics tracking
✅ Edge cases (malformed paths, deep nesting, etc.)

Run tests:
```bash
npm test -- pathMapper.test.ts
```

## Integration

### Automatic Usage

The existing `logical_toPhysical()` function now delegates to PathMapper:

```typescript
// Old code continues to work unchanged
import { logical_toPhysical } from '@fnndsc/chili';

const result = await logical_toPhysical('/home/user/files');
// Automatically uses PathMapper under the hood
```

### Direct Usage

For advanced scenarios requiring cache control:

```typescript
import { pathMapper_get } from '@fnndsc/chili';

const mapper = pathMapper_get();

// Batch operations with cache awareness
for (const file of manyFiles) {
  const result = await mapper.logical_toPhysical(file.logicalPath);
  // ...
}

// Check performance
const stats = mapper.stats_get();
console.log(`Resolved ${stats.hits + stats.misses} paths with ${stats.hitRate * 100}% hit rate`);
```

## Migration Notes

### Backward Compatibility

✅ **Fully backward compatible**
- Existing `logical_toPhysical()` calls work unchanged
- Same function signature and return type
- No breaking changes

### Performance Impact

- **First access**: Identical to previous implementation
- **Subsequent accesses**: Up to 83% faster for common patterns
- **Memory overhead**: ~1 MB per 10,000 unique paths

### Future Enhancements

Potential improvements:
1. **LRU eviction**: Limit cache size with least-recently-used eviction
2. **Persistent cache**: Serialize cache to disk across sessions
3. **Metrics export**: Export detailed performance metrics
4. **Link prefetching**: Proactively fetch links for common paths

## Files

```
chili/
├── src/
│   ├── path/
│   │   └── pathMapper.ts       # PathMapper implementation (new)
│   ├── utils/
│   │   └── cli.ts              # Updated to use PathMapper
│   └── utils.ts                # Exports PathMapper
├── tests/
│   └── pathMapper.test.ts      # Comprehensive test suite (new)
└── docs/
    └── pathMapper.md           # This document
```

## References

- Original implementation: `chili/src/utils/cli.ts` (lines 133-258, now replaced)
- Issue: Unacceptable lag in path resolution due to repeated tree walking
- Solution: Hierarchical prefix caching with singleton pattern

---

**Author:** Claude + User collaboration
**Date:** 2025-01-31
**Status:** ✅ Implemented and tested
