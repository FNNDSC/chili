import { feeds_list_do } from '../../../src/commands/feeds/list';
import * as salsa from '@fnndsc/salsa';
import { FilteredResourceData } from '@fnndsc/cumin';

jest.mock('@fnndsc/salsa');

describe('commands/feeds/list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call salsa.feeds_list with correct options', async () => {
    const mockData: FilteredResourceData = {
      tableData: [{ id: 1, name: 'feed-test' }],
      selectedFields: ['id', 'name']
    };
    (salsa.feeds_list as jest.Mock).mockResolvedValue(mockData);

    const options = { page: '5', search: 'name:test' };
    const result = await feeds_list_do(options);

    expect(salsa.feeds_list).toHaveBeenCalledWith(expect.objectContaining({
      limit: 5,
      offset: 0,
      name: 'test'
    }));
    expect(result).toEqual(mockData);
  });

  it('should return null if salsa.feeds_list returns null', async () => {
    (salsa.feeds_list as jest.Mock).mockResolvedValue(null);

    const options = {};
    const result = await feeds_list_do(options);

    expect(result).toBeNull();
  });
});
