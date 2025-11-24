import { files_doList } from '../../../src/commands/files/list';
import * as salsa from '@fnndsc/salsa';
import * as cumin from '@fnndsc/cumin'; // Still import cumin types if needed
import * as cliUtils from '../../../src/utils/cli'; // Import cliUtils to mock options_toParams

jest.mock('@fnndsc/salsa');
jest.mock('@fnndsc/cumin'); // Mock cumin to avoid issues with other imports/logic
jest.mock('../../../src/utils/cli'); // Mock cliUtils specifically for options_toParams

describe('commands/files/list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock options_toParams from cliUtils since it's used internally
    (cliUtils.options_toParams as jest.Mock).mockImplementation((opts) => ({
      limit: parseInt(opts.page || '20', 10),
      search: opts.search,
      fields: opts.fields
    }));
  });

  it('should call salsa.files_list with correct options and default assetName', async () => {
    const mockData = {
      tableData: [{ fname: 'file1' }],
      selectedFields: ['fname']
    };
    (salsa.files_list as jest.Mock).mockResolvedValue(mockData);

    const options = { page: '10', search: 'name:test' };
    const result = await files_doList(options);

    expect(cliUtils.options_toParams).toHaveBeenCalledWith(options);
    expect(salsa.files_list).toHaveBeenCalledWith(expect.objectContaining({
      limit: 10,
      search: 'name:test'
    }), 'files', undefined); // Default assetName and path
    expect(result).toEqual(mockData);
  });

  it('should call salsa.files_list with specified assetName and path', async () => {
    const mockData = {
      tableData: [{ fname: 'dir1' }],
      selectedFields: ['fname']
    };
    (salsa.files_list as jest.Mock).mockResolvedValue(mockData);

    const options = { page: '5' };
    const assetName = 'dirs';
    const path = '/some/path';
    const result = await files_doList(options, assetName, path);

    expect(cliUtils.options_toParams).toHaveBeenCalledWith(options); // Ensure it uses the local cliUtils mock
    expect(salsa.files_list).toHaveBeenCalledWith(expect.objectContaining({ limit: 5 }), assetName, path);
    expect(result).toEqual(mockData);
  });

  it('should return null if salsa.files_list returns null', async () => {
    (salsa.files_list as jest.Mock).mockResolvedValue(null);

    const options = {};
    const result = await files_doList(options);

    expect(result).toBeNull();
  });
});
