import { pluginsOverview_display } from '../../../src/commands/plugins/overview';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('pluginsOverview_display', () => {
  it('should call salsa.plugins_overview', async () => {
    (salsa.plugins_overview as jest.Mock).mockResolvedValue(undefined);
    await pluginsOverview_display();
    expect(salsa.plugins_overview).toHaveBeenCalled();
  });
});
