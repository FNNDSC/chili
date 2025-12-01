import { feeds_fetchList } from '../../../src/commands/feeds/list';
import * as salsa from '@fnndsc/salsa';
import * as cliUtils from '../../../src/utils/cli';

jest.mock('@fnndsc/salsa');
jest.mock('../../../src/utils/cli');

describe('commands/feeds/list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (cliUtils.options_toParams as jest.Mock).mockImplementation((opts) => opts);
  });

  it('should call salsa.feeds_list with params', async () => {
    const mockData = { feeds: [], selectedFields: [] };
    (salsa.feeds_list as jest.Mock).mockResolvedValue(mockData);

    const options = { page: '1' };
    const result = await feeds_fetchList(options);

    expect(cliUtils.options_toParams).toHaveBeenCalledWith(options);
    expect(salsa.feeds_list).toHaveBeenCalledWith(options);
    expect(result).toEqual(mockData);
  });
});
