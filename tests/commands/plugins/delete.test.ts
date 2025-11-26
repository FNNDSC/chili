import { plugins_searchByTerm, plugin_deleteById } from '../../../src/commands/plugins/delete';
import * as salsa from '@fnndsc/salsa';
import * as cliUtils from '../../../src/utils/cli'; // Import cliUtils for mocking

jest.mock('@fnndsc/salsa');
jest.mock('../../../src/utils/cli', () => ({
  ...jest.requireActual('../../../src/utils/cli'), // Keep actual implementations for other cliUtils functions
  options_toParams: jest.fn(), // Mock options_toParams
}));

describe('commands/plugins/delete', () => {
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

  describe('plugins_searchByTerm', () => {
    it('should call salsa.plugins_list with search params', async () => {
      const mockData = { tableData: [{ id: 1, name: 'p1' }] };
      (salsa.plugins_list as jest.Mock).mockResolvedValue(mockData);

      const result = await plugins_searchByTerm('term');

      expect(cliUtils.options_toParams).toHaveBeenCalledWith({ search: 'term' });
      expect(salsa.plugins_list).toHaveBeenCalledWith(expect.objectContaining({ search: 'term' }));
      expect(result).toEqual(mockData.tableData);
    });

    it('should return empty array if no results', async () => {
      (salsa.plugins_list as jest.Mock).mockResolvedValue(null);
      const result = await plugins_searchByTerm('term');
      expect(result).toEqual([]);
    });
  });

  describe('plugin_deleteById', () => {
    it('should call salsa.plugin_delete', async () => {
      (salsa.plugin_delete as jest.Mock).mockResolvedValue(true);
      const result = await plugin_deleteById(123);
      expect(salsa.plugin_delete).toHaveBeenCalledWith(123);
      expect(result).toBe(true);
    });
  });
});
