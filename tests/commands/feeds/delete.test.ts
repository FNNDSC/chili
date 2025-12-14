import { feeds_searchByTerm, feed_deleteById } from '../../../src/commands/feeds/delete';
import * as salsa from '@fnndsc/salsa';
import * as cliUtils from '../../../src/utils/cli'; // Import cliUtils for mocking

jest.mock('@fnndsc/salsa');
jest.mock('../../../src/utils/cli', () => ({
  ...jest.requireActual('../../../src/utils/cli'), // Keep actual implementations for other cliUtils functions
  options_toParams: jest.fn(), // Mock options_toParams
}));

describe('commands/feeds/delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock options_toParams to return an object that correctly includes the search term
    (cliUtils.options_toParams as jest.Mock).mockImplementation((options) => {
      const params = { limit: 20, offset: 0 };
      if (options.search) {
        Object.assign(params, { search: options.search });
      }
      return params;
    });
  });

  describe('feeds_searchByTerm', () => {
    it('should call salsa.feeds_list with search params', async () => {
      const mockData = { tableData: [{ id: 1, name: 'f1' }] };
      (salsa.feeds_list as jest.Mock).mockResolvedValue(mockData);

      const result = await feeds_searchByTerm('term');

      expect(cliUtils.options_toParams).toHaveBeenCalledWith({ search: 'term' });
      expect(salsa.feeds_list).toHaveBeenCalledWith(expect.objectContaining({ search: 'term' }));
      expect(result).toEqual(mockData.tableData);
    });

    it('should return empty array if no results', async () => {
      (salsa.feeds_list as jest.Mock).mockResolvedValue(null);
      const result = await feeds_searchByTerm('term');
      expect(result).toEqual([]);
    });
  });

  describe('feed_deleteById', () => {
    it('should call salsa.feed_delete', async () => {
      (salsa.feed_delete as jest.Mock).mockResolvedValue(true);
      const result = await feed_deleteById(123);
      expect(salsa.feed_delete).toHaveBeenCalledWith(123);
      expect(result).toBe(true);
    });

    it('returns false when feed deletion fails', async () => {
      (salsa.feed_delete as jest.Mock).mockResolvedValue(false);
      const result = await feed_deleteById(321);
      expect(result).toBe(false);
    });
  });
});
