import { plugins_overview_do } from '../../../src/commands/plugins/overview';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/plugins/overview', () => {
  it('should call salsa.plugins_overview', async () => {
    (salsa.plugins_overview as jest.Mock).mockResolvedValue(undefined);
    await plugins_overview_do();
    expect(salsa.plugins_overview).toHaveBeenCalled();
  });
});
