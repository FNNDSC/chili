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

  it('should return false if salsa.connect_do returns Err()', async () => {
    (salsa.connect_do as jest.Mock).mockResolvedValue({ ok: false }); // Mock salsa.connect_do to return Err()
    const mockOptions = { url: 'http://example.com', user: 'test', password: 'password', debug: false };
    const result = await connect_login(mockOptions);
    expect(result).toBe(false);
    expect(salsa.connect_do).toHaveBeenCalledWith(mockOptions);
    // Expect no console.error calls from connect_login itself
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
