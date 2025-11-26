import { plugin_execute } from '../../../src/commands/plugin/run';
import * as salsa from '@fnndsc/salsa';
import * as cumin from '@fnndsc/cumin';

jest.mock('@fnndsc/salsa');
jest.mock('@fnndsc/cumin');

describe('commands/plugin/run', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (cumin.dictionary_fromCLI as jest.Mock).mockImplementation((paramString) => {
      if (paramString === '--param1 value1') {
        return { param1: 'value1' };
      }
      if (paramString === 'invalid') {
        throw new Error('Invalid param string');
      }
      return {};
    });
  });

  it('should parse parameters and call salsa.plugin_run', async () => {
    const mockInstance = { id: 1, name: 'test-instance' };
    (salsa.plugin_run as jest.Mock).mockResolvedValue(mockInstance);

    const result = await plugin_execute('plugin-name', '--param1 value1');

    expect(cumin.dictionary_fromCLI).toHaveBeenCalledWith('--param1 value1');
    expect(salsa.plugin_run).toHaveBeenCalledWith('plugin-name', { param1: 'value1' });
    expect(result).toEqual(mockInstance);
  });

  it('should return null if salsa.plugin_run fails', async () => {
    (salsa.plugin_run as jest.Mock).mockResolvedValue(null);

    const result = await plugin_execute('plugin-name', '');

    expect(result).toBeNull();
  });

  it('should throw an error if parameter parsing fails', async () => {
    await expect(plugin_execute('plugin-name', 'invalid')).rejects.toThrow('Error parsing plugin parameters: Error: Invalid param string');
  });
});
