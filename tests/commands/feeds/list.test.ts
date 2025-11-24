import { feeds_doList } from '../../../src/commands/feeds/list';
import * as salsa from '@fnndsc/salsa';
import { CLIoptions } from '../../../src/utils/cli';

jest.mock('@fnndsc/salsa');

describe('commands/feeds/list', () => {
  it('should call salsa.feeds_list', async () => {
    (salsa.feeds_list as jest.Mock).mockResolvedValue({});
    const options: CLIoptions = { page: '1' };
    
    await feeds_doList(options);

    expect(salsa.feeds_list).toHaveBeenCalled();
  });
});
