import { connect_logout } from '../../../src/commands/connect/logout';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('connect_logout', () => {
  it('should call salsa.logout_do', async () => {
    (salsa.logout_do as jest.Mock).mockResolvedValue(undefined);
    await connect_logout();
    expect(salsa.logout_do).toHaveBeenCalled();
  });
});
