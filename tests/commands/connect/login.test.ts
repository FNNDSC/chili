import { login_do } from '../../../src/commands/connect/login';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/connect/login', () => {
  it('should call salsa.connect_do', async () => {
    (salsa.connect_do as jest.Mock).mockResolvedValue(undefined);
    const options = { url: 'http://cube', user: 'user', password: 'pw', debug: false, token: 'token' };
    
    await login_do(options);

    expect(salsa.connect_do).toHaveBeenCalledWith(options);
  });
});
