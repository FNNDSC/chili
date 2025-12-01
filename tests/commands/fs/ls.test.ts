import { files_list } from '../../../src/commands/fs/ls';
import { ListingItem } from '../../../src/models/listing.js';
import * as salsa from '@fnndsc/salsa';
import * as cumin from '@fnndsc/cumin';

jest.mock('@fnndsc/salsa');
jest.mock('@fnndsc/cumin');

describe('files_list', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock salsa.files_getGroup to return a structure that contains an 'asset' with 'resources_listAndFilterByOptions'
    (salsa.files_listAll as jest.Mock).mockImplementation(async (options: any, assetName: string, path: string) => {
      if (assetName === 'dirs') {
        return {
          tableData: [{ fname: 'dir1', path: '/path/to/dir1' }, { fname: 'dir2', path: '/path/to/dir2' }],
          selectedFields: ['fname', 'path']
        };
      } else if (assetName === 'files') {
        return {
          tableData: [{ fname: 'file1.txt', path: '/path/to/file1.txt' }, { fname: 'file2.txt', path: '/path/to/file2.txt' }],
          selectedFields: ['fname', 'path']
        };
      } else if (assetName === 'links') {
        return {
          tableData: [{ fname: 'link1', path: '/path/to/link1' }],
          selectedFields: ['fname', 'path']
        };
      }
      return { tableData: [], selectedFields: [] };
    });

    // Mock params_fromOptions directly since it's used in files_list implementation
    (cumin.params_fromOptions as jest.Mock).mockReturnValue({ limit: 100, offset: 0 });
  });

  it('should return a sorted list of ResourceItems for dirs, files, and links', async () => {
    const options = {};
    const pathStr = '/';
    const result = await files_list(options, pathStr);

    expect(salsa.files_listAll).toHaveBeenCalledWith(expect.any(Object), 'dirs', pathStr);
    expect(salsa.files_listAll).toHaveBeenCalledWith(expect.any(Object), 'files', pathStr);
    expect(salsa.files_listAll).toHaveBeenCalledWith(expect.any(Object), 'links', pathStr);
    expect(result).toHaveLength(5); // 2 dirs + 2 files + 1 link
          expect(result).toEqual([
            { name: 'dir1', type: 'dir', size: 0, owner: 'unknown', date: '', target: '/path/to/dir1' },
            { name: 'dir2', type: 'dir', size: 0, owner: 'unknown', date: '', target: '/path/to/dir2' },
            { name: 'file1.txt', type: 'file', size: 0, owner: 'unknown', date: '', target: '/path/to/file1.txt' },
            { name: 'file2.txt', type: 'file', size: 0, owner: 'unknown', date: '', target: '/path/to/file2.txt' },
            { name: 'link1', type: 'link', size: 0, owner: 'unknown', date: '', target: '/path/to/link1' }
          ]);  });

  it('should handle empty results gracefully', async () => {
    (salsa.files_listAll as jest.Mock).mockImplementation(async (options: any, assetName: string, path: string) => {
        // For this specific test, always return empty tableData
        return { tableData: [], selectedFields: [] };
    });

    const options = {};
    const pathStr = '/empty';
    const result = await files_list(options, pathStr);

    expect(result).toHaveLength(0);
  });

  it('should extract filename from path if fname is not present', async () => {
    (salsa.files_listAll as jest.Mock).mockImplementation(async (options: any, assetName: string, path: string) => {
        if (assetName === 'files') { // Only return for files asset type
          return {
            tableData: [{ path: '/some/deep/path/my_file.txt' }], // only path, no fname
            selectedFields: ['path']
          };
        }
        return { tableData: [], selectedFields: [] }; // Other asset types (dirs, links) return empty
    });

      const options = {};
      const pathStr = '/';
      const result = await files_list(options, pathStr);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: 'my_file.txt', type: 'file', size: 0, owner: 'unknown', date: '', target: '/some/deep/path/my_file.txt' });
  });
});
