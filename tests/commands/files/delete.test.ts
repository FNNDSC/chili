import { files_delete_search, files_delete_do } from '../../../src/commands/files/delete';
import * as salsa from '@fnndsc/salsa';
import { FilteredResourceData } from '@fnndsc/cumin';

jest.mock('@fnndsc/salsa');

describe('commands/files/delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('files_delete_search', () => {
    it('should call salsa.files_list and return items', async () => {
      const mockData: FilteredResourceData = {
        tableData: [{ id: 1, fname: 'file1' }],
        selectedFields: ['id', 'fname']
      };
      (salsa.files_list as jest.Mock).mockResolvedValue(mockData);

      const searchable = 'fname:file1';
      const result = await files_delete_search(searchable, 'files');

      expect(salsa.files_list).toHaveBeenCalledWith(expect.objectContaining({
        fname: 'file1'
      }), 'files');
      expect(result).toEqual(mockData.tableData);
    });

    it('should return empty array if salsa returns null', async () => {
      (salsa.files_list as jest.Mock).mockResolvedValue(null);

      const result = await files_delete_search('fname:none', 'files');

      expect(result).toEqual([]);
    });
  });

  describe('files_delete_do', () => {
    it('should call salsa.files_delete with id and assetName', async () => {
      (salsa.files_delete as jest.Mock).mockResolvedValue(true);

      const result = await files_delete_do(123, 'files');

      expect(salsa.files_delete).toHaveBeenCalledWith(123, 'files');
      expect(result).toBe(true);
    });
  });
});
