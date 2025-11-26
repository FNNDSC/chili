import { pluginFields_fetch } from '../../../src/commands/plugins/fields';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/plugins/fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call salsa.pluginFields_get and return fields', async () => {
    const mockFields = ['name', 'version'];
    (salsa.pluginFields_get as jest.Mock).mockResolvedValue(mockFields);

    const result = await pluginFields_fetch();

    expect(salsa.pluginFields_get).toHaveBeenCalled();
    expect(result).toEqual(mockFields);
  });

  it('should return null if salsa returns null', async () => {
    (salsa.pluginFields_get as jest.Mock).mockResolvedValue(null);

    const result = await pluginFields_fetch();

    expect(result).toBeNull();
  });
});
