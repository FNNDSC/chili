import { pluginReadme_fetch } from '../../../src/commands/plugin/readme';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/plugin/readme', () => {
  it('should call salsa.plugin_readme with the provided pluginId', async () => {
    (salsa.plugin_readme as jest.Mock).mockResolvedValue('Mock README Content');
    const result = await pluginReadme_fetch('123');
    expect(salsa.plugin_readme).toHaveBeenCalledWith('123');
    expect(result).toBe('Mock README Content');
  });

  it('should return null if salsa.plugin_readme returns null', async () => {
    (salsa.plugin_readme as jest.Mock).mockResolvedValue(null);
    const result = await pluginReadme_fetch('456');
    expect(result).toBeNull();
  });
});
