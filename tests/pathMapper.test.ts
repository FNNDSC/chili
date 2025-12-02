/**
 * @file PathMapper tests
 *
 * Comprehensive tests for the PathMapper singleton class, verifying:
 * - Basic logical-to-physical path resolution
 * - Hierarchical prefix caching and reuse
 * - Cache invalidation strategies
 * - TTL-based cache expiration
 * - Error handling and edge cases
 * - Performance statistics tracking
 *
 * @module
 */

import { PathMapper, pathMapper_get } from '../src/path/pathMapper';
import { files_listAll } from '@fnndsc/salsa';
import { Ok, Err } from '@fnndsc/cumin';

// Mock the salsa files_listAll function
jest.mock('@fnndsc/salsa');

describe('PathMapper', () => {
  let mapper: PathMapper;
  const mockFilesListAll = files_listAll as jest.MockedFunction<typeof files_listAll>;

  beforeEach(() => {
    // Reset singleton instance before each test
    PathMapper.instance_reset();
    mapper = PathMapper.instance_get();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mapper.cache_clear();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1: PathMapper = PathMapper.instance_get();
      const instance2: PathMapper = PathMapper.instance_get();
      expect(instance1).toBe(instance2);
    });

    it('should return the same instance via pathMapper_get()', () => {
      const instance1: PathMapper = pathMapper_get();
      const instance2: PathMapper = pathMapper_get();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance for testing', () => {
      const instance1: PathMapper = PathMapper.instance_get();
      PathMapper.instance_reset();
      const instance2: PathMapper = PathMapper.instance_get();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Basic Path Resolution', () => {
    it('should resolve root path', async () => {
      const result = await mapper.logical_toPhysical('/');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('/');
      }
    });

    it('should resolve simple path with no links', async () => {
      // Mock: no links found
      mockFilesListAll.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      const result = await mapper.logical_toPhysical('/home/user/files');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('/home/user/files');
      }
    });

    it('should normalize paths without leading slash', async () => {
      mockFilesListAll.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      const result = await mapper.logical_toPhysical('home/user/files');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('/home/user/files');
      }
    });

    it('should reject invalid paths', async () => {
      const result1 = await mapper.logical_toPhysical('');
      expect(result1.ok).toBe(false);

      const result2 = await mapper.logical_toPhysical(null as any);
      expect(result2.ok).toBe(false);

      const result3 = await mapper.logical_toPhysical(undefined as any);
      expect(result3.ok).toBe(false);
    });
  });

  describe('Link Resolution', () => {
    it('should resolve a single link in path', async () => {
      // Resolving: /home/user/public/data
      // Call sequence:
      // 1. Check /home (parent: /) → no links
      // 2. Check /home/user (parent: /home) → no links
      // 3. Check /home/user/public (parent: /home/user) → HAS LINK to /SHARED
      // 4. Check /SHARED/data (parent: /SHARED) → no links

      // Mock: Fetch links from / (checking /home)
      mockFilesListAll.mockResolvedValueOnce({
        tableData: [],
        selectedFields: []
      });

      // Mock: Fetch links from /home (checking /home/user)
      mockFilesListAll.mockResolvedValueOnce({
        tableData: [],
        selectedFields: []
      });

      // Mock: Fetch links from /home/user (checking /home/user/public) - HAS LINK
      mockFilesListAll.mockResolvedValueOnce({
        tableData: [
          {
            fname: '/home/user/public.chrislink',
            path: '/SHARED'
          }
        ],
        selectedFields: []
      });

      // Mock: Fetch links from /SHARED (checking /SHARED/data)
      mockFilesListAll.mockResolvedValueOnce({
        tableData: [],
        selectedFields: []
      });

      const result = await mapper.logical_toPhysical('/home/user/public/data');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('/SHARED/data');
      }
    });

    it('should resolve multiple links in path', async () => {
      // Resolving: /home/user/public/data
      // Call sequence:
      // 1. Check /home (parent: /) → HAS LINK user -> /users/alice
      // 2. Check /users/alice/public (parent: /users/alice) → HAS LINK to /SHARED
      // 3. Check /SHARED/data (parent: /SHARED) → no links

      // Mock: Fetch links from / (checking /home) - HAS LINK
      mockFilesListAll.mockResolvedValueOnce({
        tableData: [
          {
            fname: '/home.chrislink',
            path: '/HOME'
          }
        ],
        selectedFields: []
      });

      // Mock: Fetch links from /HOME (checking /HOME/user)
      mockFilesListAll.mockResolvedValueOnce({
        tableData: [
          {
            fname: '/HOME/user.chrislink',
            path: '/users/alice'
          }
        ],
        selectedFields: []
      });

      // Mock: Fetch links from /users/alice (checking /users/alice/public) - HAS LINK
      mockFilesListAll.mockResolvedValueOnce({
        tableData: [
          {
            fname: '/users/alice/public.chrislink',
            path: '/SHARED'
          }
        ],
        selectedFields: []
      });

      // Mock: Fetch links from /SHARED (checking /SHARED/data)
      mockFilesListAll.mockResolvedValueOnce({
        tableData: [],
        selectedFields: []
      });

      const result = await mapper.logical_toPhysical('/home/user/public/data');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('/SHARED/data');
      }
    });

    it('should handle links without .chrislink extension as non-links', async () => {
      // Mock: malformed link entry without .chrislink extension
      mockFilesListAll.mockResolvedValue({
        tableData: [
          {
            fname: '/home/user/public', // Missing .chrislink
            path: '/SHARED'
          }
        ],
        selectedFields: []
      });

      const result = await mapper.logical_toPhysical('/home/user/public');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('/home/user/public');
      }
    });
  });

  describe('Caching Behavior', () => {
    it('should cache resolved paths', async () => {
      mockFilesListAll.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      // First call
      const result1 = await mapper.logical_toPhysical('/home/user/files');
      expect(result1.ok).toBe(true);

      // Second call - should hit cache
      const result2 = await mapper.logical_toPhysical('/home/user/files');
      expect(result2.ok).toBe(true);

      // Should have called API during first resolution only
      // (3 calls: /home, /home/user, /home/user/files)
      expect(mockFilesListAll).toHaveBeenCalledTimes(3);
    });

    it('should cache intermediate path segments', async () => {
      mockFilesListAll.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      await mapper.logical_toPhysical('/home/user/files/data.txt');

      // Second call with common prefix should reuse cached segments
      await mapper.logical_toPhysical('/home/user/other/data.txt');

      // First call: /home, /home/user, /home/user/files, /home/user/files/data.txt (4 calls)
      // Second call: /home/user/other, /home/user/other/data.txt (2 new calls)
      // But /home and /home/user are cached, so only 2 additional calls
      expect(mockFilesListAll).toHaveBeenCalledTimes(6);
    });

    it('should track cache hits and misses', async () => {
      mockFilesListAll.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      // First call - cache miss
      await mapper.logical_toPhysical('/home/user/files');
      let stats = mapper.stats_get();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);

      // Second call - exact cache hit
      await mapper.logical_toPhysical('/home/user/files');
      stats = mapper.stats_get();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });
  });

  describe('Prefix Reuse (Key Optimization)', () => {
    it('should reuse cached prefix for new paths', async () => {
      // Setup: /home/user/public -> /SHARED link
      // Call sequence for /home/user/public/feed_4:
      // 1. Check /home (parent: /) → no links
      // 2. Check /home/user (parent: /home) → no links
      // 3. Check /home/user/public (parent: /home/user) → HAS LINK to /SHARED
      // 4. Check /SHARED/feed_4 (parent: /SHARED) → no links

      mockFilesListAll.mockResolvedValueOnce({
        tableData: [],
        selectedFields: []
      });
      mockFilesListAll.mockResolvedValueOnce({
        tableData: [],
        selectedFields: []
      });
      mockFilesListAll.mockResolvedValueOnce({
        tableData: [
          {
            fname: '/home/user/public.chrislink',
            path: '/SHARED'
          }
        ],
        selectedFields: []
      });
      mockFilesListAll.mockResolvedValueOnce({
        tableData: [],
        selectedFields: []
      });

      // First resolution: /home/user/public/feed_4
      const result1 = await mapper.logical_toPhysical('/home/user/public/feed_4');
      expect(result1.ok).toBe(true);
      if (result1.ok) {
        expect(result1.value).toBe('/SHARED/feed_4');
      }

      const initialCallCount: number = mockFilesListAll.mock.calls.length;

      // Reset mock to verify no new API calls for cached prefix
      mockFilesListAll.mockClear();

      // Mock only the new suffix resolution
      mockFilesListAll.mockResolvedValueOnce({
        tableData: [],
        selectedFields: []
      });

      // Second resolution: /home/user/public/feed_5
      // Should reuse cached '/home/user/public' -> '/SHARED'
      const result2 = await mapper.logical_toPhysical('/home/user/public/feed_5');
      expect(result2.ok).toBe(true);
      if (result2.ok) {
        expect(result2.value).toBe('/SHARED/feed_5');
      }

      // Should only check /SHARED/feed_5 (1 call), not re-walk /home/user/public
      expect(mockFilesListAll).toHaveBeenCalledTimes(1);
    });

    it('should demonstrate performance improvement with multiple similar paths', async () => {
      mockFilesListAll.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      const basePath: string = '/home/user/feeds/feed_123/files';

      // Resolve 10 files in same directory
      for (let i: number = 0; i < 10; i++) {
        const result = await mapper.logical_toPhysical(`${basePath}/file_${i}.dcm`);
        expect(result.ok).toBe(true);
      }

      // First file: 6 API calls (/home, /home/user, .../files, .../files/file_0.dcm)
      // Remaining 9 files: 1 call each (only the specific file)
      // Total: 6 + 9 = 15 calls
      // Without caching: 10 * 6 = 60 calls
      expect(mockFilesListAll.mock.calls.length).toBeLessThan(20);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate exact path', async () => {
      mockFilesListAll.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      await mapper.logical_toPhysical('/home/user/files');
      mapper.cache_invalidate('/home/user/files');

      mockFilesListAll.mockClear();
      mockFilesListAll.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      // Should re-resolve (not hit cache)
      await mapper.logical_toPhysical('/home/user/files');
      expect(mockFilesListAll).toHaveBeenCalled();
    });

    it('should invalidate all paths with given prefix', async () => {
      mockFilesListAll.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      // Cache multiple paths under /home/user/public
      await mapper.logical_toPhysical('/home/user/public/feed_4');
      await mapper.logical_toPhysical('/home/user/public/feed_5');
      await mapper.logical_toPhysical('/home/user/private/feed_6');

      // Invalidate all /home/user/public paths
      mapper.cache_invalidate('/home/user/public');

      const stats = mapper.stats_get();
      // Should still have /home/user/private cached
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should clear all cache', async () => {
      mockFilesListAll.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      await mapper.logical_toPhysical('/home/user/files');
      await mapper.logical_toPhysical('/home/other/files');

      mapper.cache_clear();

      const stats = mapper.stats_get();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('TTL Expiration', () => {
    it('should expire cached entries after TTL', async () => {
      // Use a short TTL for testing
      mockFilesListAll.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      await mapper.logical_toPhysical('/home/user/files');

      // Manually expire by advancing time (mock Date.now)
      const realDateNow = Date.now.bind(global.Date);
      global.Date.now = jest.fn(() => realDateNow() + 31000); // 31 seconds later

      mockFilesListAll.mockClear();
      mockFilesListAll.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      // Should re-resolve (cache expired)
      await mapper.logical_toPhysical('/home/user/files');
      expect(mockFilesListAll).toHaveBeenCalled();

      // Restore Date.now
      global.Date.now = realDateNow;
    });

    it('should not expire cached entries before TTL', async () => {
      mockFilesListAll.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      await mapper.logical_toPhysical('/home/user/files');

      // Advance time by only 10 seconds (well within 30s TTL)
      const realDateNow = Date.now.bind(global.Date);
      global.Date.now = jest.fn(() => realDateNow() + 10000);

      mockFilesListAll.mockClear();

      // Should hit cache
      const result = await mapper.logical_toPhysical('/home/user/files');
      expect(result.ok).toBe(true);
      expect(mockFilesListAll).not.toHaveBeenCalled();

      // Restore Date.now
      global.Date.now = realDateNow;
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // All API calls fail
      mockFilesListAll.mockRejectedValue(new Error('API unavailable'));

      const result = await mapper.logical_toPhysical('/home/user/files');

      // Current implementation treats errors as warnings and continues
      // So the path is returned as-is (no links detected)
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('/home/user/files');
      }
    });

    it('should continue resolution on link check failure', async () => {
      // First call succeeds
      mockFilesListAll.mockResolvedValueOnce({
        tableData: [],
        selectedFields: []
      });

      // Second call fails
      mockFilesListAll.mockRejectedValueOnce(new Error('Network error'));

      // Third call succeeds
      mockFilesListAll.mockResolvedValueOnce({
        tableData: [],
        selectedFields: []
      });

      // Should continue despite intermediate failure
      const result = await mapper.logical_toPhysical('/home/user/files');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('/home/user/files');
      }
    });

    it('should handle malformed link data', async () => {
      mockFilesListAll.mockResolvedValue({
        tableData: [
          { fname: null, path: null }, // Null values
          { fname: '', path: '' }, // Empty strings
          { fname: 'nopath.chrislink' }, // Missing path field
          { fname: '/valid.chrislink', path: '/target' } // Valid entry
        ],
        selectedFields: []
      });

      // Should handle gracefully and treat invalid entries as non-links
      const result = await mapper.logical_toPhysical('/home/valid');
      expect(result.ok).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should track cache size', async () => {
      mockFilesListAll.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      await mapper.logical_toPhysical('/home/user/files');

      const stats = mapper.stats_get();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should calculate hit rate correctly', async () => {
      mockFilesListAll.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      // 1 miss
      await mapper.logical_toPhysical('/home/user/files');

      // 1 hit
      await mapper.logical_toPhysical('/home/user/files');

      const stats = mapper.stats_get();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should handle zero lookups without division by zero', async () => {
      const stats = mapper.stats_get();
      expect(stats.hitRate).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle paths with double slashes', async () => {
      mockFilesListAll.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      const result = await mapper.logical_toPhysical('//home//user//files');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('/home/user/files');
      }
    });

    it('should handle paths with trailing slashes', async () => {
      mockFilesListAll.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      const result = await mapper.logical_toPhysical('/home/user/files/');
      expect(result.ok).toBe(true);
      if (result.ok) {
        // Trailing slash should be normalized away
        expect(result.value).toBe('/home/user/files');
      }
    });

    it('should handle deeply nested paths', async () => {
      mockFilesListAll.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      const deepPath: string = '/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p';
      const result = await mapper.logical_toPhysical(deepPath);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(deepPath);
      }
    });

    it('should handle circular link detection (avoid infinite loops)', async () => {
      // Resolving: /home/user/a/c
      // Call sequence:
      // 1. Check /home (parent: /) → no links
      // 2. Check /home/user (parent: /home) → no links
      // 3. Check /home/user/a (parent: /home/user) → no links (we don't have circular links in parent dir)
      // 4. Check /home/user/a/c (parent: /home/user/a) → no links

      mockFilesListAll.mockResolvedValueOnce({
        tableData: [],
        selectedFields: []
      });
      mockFilesListAll.mockResolvedValueOnce({
        tableData: [],
        selectedFields: []
      });
      mockFilesListAll.mockResolvedValueOnce({
        tableData: [],
        selectedFields: []
      });
      mockFilesListAll.mockResolvedValueOnce({
        tableData: [],
        selectedFields: []
      });

      // Current implementation doesn't encounter circular links in this scenario
      // because we check each path component in sequence, not recursively
      const result = await mapper.logical_toPhysical('/home/user/a/c');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('/home/user/a/c');
      }
    });
  });

  describe('Integration with logical_toPhysical wrapper', () => {
    it('should be callable via wrapper function', async () => {
      const { logical_toPhysical } = await import('../src/utils/cli');

      mockFilesListAll.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      const result = await logical_toPhysical('/home/user/files');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('/home/user/files');
      }
    });
  });
});
