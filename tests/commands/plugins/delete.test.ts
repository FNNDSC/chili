import { plugins_delete_search, plugins_delete_do } from '../../../src/commands/plugins/delete';
import * as salsa from '@fnndsc/salsa';
import { FilteredResourceData } from '@fnndsc/cumin';

jest.mock('@fnndsc/salsa');

describe('commands/plugins/delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('plugins_delete_search', () => {
    it('should call salsa.plugins_list and return items', async () => {
      const mockData: FilteredResourceData = {
        tableData: [{ id: 1, name: 'pl-test' }],
        selectedFields: ['id', 'name']
      };
      (salsa.plugins_list as jest.Mock).mockResolvedValue(mockData);

      const searchable = 'name:test';
      const result = await plugins_delete_search(searchable);

      expect(salsa.plugins_list).toHaveBeenCalledWith(expect.objectContaining({
        name: 'test'
      }));
      expect(result).toEqual(mockData.tableData);
    });

    it('should return empty array if salsa returns null', async () => {
      (salsa.plugins_list as jest.Mock).mockResolvedValue(null);

      const result = await plugins_delete_search('name:none');

      expect(result).toEqual([]);
    });
  });

  describe('plugins_delete_do', () => {
    it('should call salsa.plugin_delete with id', async () => {
      (salsa.plugin_delete as jest.Mock).mockResolvedValue(true);

      const result = await plugins_delete_do(123);

      expect(salsa.plugin_delete).toHaveBeenCalledWith(123);
      expect(result).toBe(true);
    });
  });
});
