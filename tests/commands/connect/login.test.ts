import { connect_login } from '../../../src/commands/connect/login';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('connect_login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call salsa.connect_do with provided options', async () => {
    (salsa.connect_do as jest.Mock).mockResolvedValue('mock-token');
    const mockOptions = { url: 'http://example.com', user: 'test', password: 'password', debug: false };
    await connect_login(mockOptions);
    expect(salsa.connect_do).toHaveBeenCalledWith(mockOptions);
  });

  it('should log error if salsa.connect_do fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (salsa.connect_do as jest.Mock).mockRejectedValue(new Error('Connection failed'));
    const mockOptions = { url: 'http://example.com', user: 'test', password: 'password', debug: false };
    await connect_login(mockOptions);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to connect:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});
