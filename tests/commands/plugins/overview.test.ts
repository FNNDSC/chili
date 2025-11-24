import { plugins_doOverview } from '../../../src/commands/plugins/overview';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/plugins/overview', () => {
  it('should call salsa.plugins_overview', async () => {
    (salsa.plugins_overview as jest.Mock).mockResolvedValue(undefined);
    await plugins_doOverview();
    expect(salsa.plugins_overview).toHaveBeenCalled();
  });
});
