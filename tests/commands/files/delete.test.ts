import { files_searchByTerm, files_deleteById } from '../../../src/commands/files/delete';
import * as salsa from '@fnndsc/salsa';
import * as cliUtils from '../../../src/utils/cli'; // Import cliUtils for mocking

jest.mock('@fnndsc/salsa');
jest.mock('../../../src/utils/cli', () => ({
  ...jest.requireActual('../../../src/utils/cli'), // Keep actual implementations for other cliUtils functions
  options_toParams: jest.fn(), // Mock options_toParams
}));

describe('files delete command', () => {
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

  describe('files_searchByTerm', () => {
    it('should call salsa files_list with search params', async () => {
      const mockTableData = [{ id: 1, fname: 'file1' }];
      (salsa.files_list as jest.Mock).mockResolvedValue({ tableData: mockTableData });

      const result = await files_searchByTerm('term', 'files');

      expect(cliUtils.options_toParams).toHaveBeenCalledWith({ search: 'term' });
      expect(salsa.files_list).toHaveBeenCalledWith(expect.objectContaining({ search: 'term' }), 'files');
      expect(result).toEqual(mockTableData);
    });

    it('should return empty array if no results', async () => {
      (salsa.files_list as jest.Mock).mockResolvedValue(null);
      const result = await files_searchByTerm('term', 'files');
      expect(result).toEqual([]);
    });
  });

  describe('files_deleteById', () => {
    it('should call salsa files_delete', async () => {
      (salsa.files_delete as jest.Mock).mockResolvedValue(true);
      const result = await files_deleteById(123, 'files');
      expect(salsa.files_delete).toHaveBeenCalledWith(123, 'files');
      expect(result).toBe(true);
    });

    it('returns false when deletion fails', async () => {
      (salsa.files_delete as jest.Mock).mockResolvedValue(false);
      const result = await files_deleteById(999, 'files');
      expect(result).toBe(false);
    });
  });
});
