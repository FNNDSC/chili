import { feeds_delete_search, feeds_delete_do } from '../../../src/commands/feeds/delete';
import * as salsa from '@fnndsc/salsa';
import { FilteredResourceData } from '@fnndsc/cumin';

jest.mock('@fnndsc/salsa');

describe('commands/feeds/delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('feeds_delete_search', () => {
    it('should call salsa.feeds_list and return items', async () => {
      const mockData: FilteredResourceData = {
        tableData: [{ id: 1, name: 'feed-test' }],
        selectedFields: ['id', 'name']
      };
      (salsa.feeds_list as jest.Mock).mockResolvedValue(mockData);

      const searchable = 'name:test';
      const result = await feeds_delete_search(searchable);

      expect(salsa.feeds_list).toHaveBeenCalledWith(expect.objectContaining({
        name: 'test'
      }));
      expect(result).toEqual(mockData.tableData);
    });

    it('should return empty array if salsa returns null', async () => {
      (salsa.feeds_list as jest.Mock).mockResolvedValue(null);

      const result = await feeds_delete_search('name:none');

      expect(result).toEqual([]);
    });
  });

  describe('feeds_delete_do', () => {
    it('should call salsa.feed_delete with id', async () => {
      (salsa.feed_delete as jest.Mock).mockResolvedValue(true);

      const result = await feeds_delete_do(123);

      expect(salsa.feed_delete).toHaveBeenCalledWith(123);
      expect(result).toBe(true);
    });
  });
});
