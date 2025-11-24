import { plugin_doReadme } from '../../../src/commands/plugin/readme';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/plugin/readme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call salsa.plugin_readme and return content', async () => {
    (salsa.plugin_readme as jest.Mock).mockResolvedValue('# Readme Content');

    const result = await plugin_doReadme('123');

    expect(salsa.plugin_readme).toHaveBeenCalledWith('123');
    expect(result).toBe('# Readme Content');
  });

  it('should return null if salsa returns null', async () => {
    (salsa.plugin_readme as jest.Mock).mockResolvedValue(null);

    const result = await plugin_doReadme('456');

    expect(result).toBeNull();
  });
});
