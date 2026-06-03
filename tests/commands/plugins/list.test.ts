import { plugins_fetchList } from '../../../src/commands/plugins/list';
import * as salsa from '@fnndsc/salsa';
import { FilteredResourceData } from '@fnndsc/cumin';

jest.mock('@fnndsc/salsa');

describe('commands/plugins/list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call salsa.plugins_list with correct options', async () => {
    (salsa.plugins_list as jest.Mock).mockResolvedValue({
      tableData: [{ id: 1, name: 'pl-test' }],
      selectedFields: ['id', 'name']
    });

    const options = { page: '5', search: 'name:test' };
    const result = await plugins_fetchList(options);

    expect(salsa.plugins_list).toHaveBeenCalledWith(expect.objectContaining({
      limit: 5,
      offset: 0,
      name: 'test'
    }));
    expect(result).toEqual({ plugins: [{ id: 1, name: 'pl-test' }], selectedFields: ['id', 'name'] });
  });

  it('should return empty result if salsa.plugins_list returns no data', async () => {
    (salsa.plugins_list as jest.Mock).mockResolvedValue({ tableData: [], selectedFields: [] });

    const options = {};
    const result = await plugins_fetchList(options);

    expect(result).toEqual({ plugins: [], selectedFields: [] });
  });
});
