import { login_do } from '../../../src/commands/connect/login';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/connect/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call salsa.connect_do with options', async () => {
    const options = { user: 'user', password: 'pw', url: 'url', debug: false };
    (salsa.connect_do as jest.Mock).mockResolvedValue(true);

    await login_do(options);

    expect(salsa.connect_do).toHaveBeenCalledWith(options);
  });

  it('should log error if connect_do throws', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const options = { user: 'user', password: 'pw', url: 'url', debug: false };
    (salsa.connect_do as jest.Mock).mockRejectedValue(new Error('Connection failed'));

    await login_do(options);

    expect(consoleSpy).toHaveBeenCalledWith('Failed to connect:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});
