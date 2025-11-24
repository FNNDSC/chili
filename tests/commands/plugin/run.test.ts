import { plugin_run_do } from '../../../src/commands/plugin/run';
import * as salsa from '@fnndsc/salsa';
import * as cumin from '@fnndsc/cumin';

jest.mock('@fnndsc/salsa');
jest.mock('@fnndsc/cumin', () => ({
  ...jest.requireActual('@fnndsc/cumin'),
  CLI_toDictionary: jest.fn()
}));

describe('commands/plugin/run', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should parse params and call salsa.plugin_run', async () => {
    const mockParams = { foo: 'bar' };
    (cumin.CLI_toDictionary as jest.Mock).mockReturnValue(mockParams);
    (salsa.plugin_run as jest.Mock).mockResolvedValue({ id: 123 });

    const result = await plugin_run_do('pl-test', '--foo bar');

    expect(cumin.CLI_toDictionary).toHaveBeenCalledWith('--foo bar');
    expect(salsa.plugin_run).toHaveBeenCalledWith('pl-test', mockParams);
    expect(result).toEqual({ id: 123 });
  });

  it('should throw error if parsing fails', async () => {
    (cumin.CLI_toDictionary as jest.Mock).mockImplementation(() => {
      throw new Error('Parsing failed');
    });

    await expect(plugin_run_do('pl-test', 'invalid')).rejects.toThrow('Error parsing plugin parameters: Error: Parsing failed');
  });
});
