import { logout_do } from '../../../src/commands/connect/logout';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/connect/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call salsa.logout_do', async () => {
    await logout_do();
    expect(salsa.logout_do).toHaveBeenCalled();
  });
});
