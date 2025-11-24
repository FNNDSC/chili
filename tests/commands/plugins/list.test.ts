import { plugins_doList } from '../../../src/commands/plugins/list';
import * as salsa from '@fnndsc/salsa';
import { FilteredResourceData } from '@fnndsc/cumin';

jest.mock('@fnndsc/salsa');

describe('commands/plugins/list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call salsa.plugins_list with correct options', async () => {
    const mockData: FilteredResourceData = {
      tableData: [{ id: 1, name: 'pl-test' }],
      selectedFields: ['id', 'name']
    };
    (salsa.plugins_list as jest.Mock).mockResolvedValue(mockData);

    const options = { page: '5', search: 'name:test' };
    const result = await plugins_doList(options);

    expect(salsa.plugins_list).toHaveBeenCalledWith(expect.objectContaining({
      limit: 5,
      offset: 0,
      name: 'test' // options_toParams parses "name:test" into { name: "test" }
    }));
    expect(result).toEqual(mockData);
  });

  it('should return null if salsa.plugins_list returns null', async () => {
    (salsa.plugins_list as jest.Mock).mockResolvedValue(null);

    const options = {};
    const result = await plugins_doList(options);

    expect(result).toBeNull();
  });
});
