import { feedFields_fetch } from '../../../src/commands/feeds/fields';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/feeds/fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call salsa.feedFields_get and return fields', async () => {
    const mockFields = ['id', 'name'];
    (salsa.feedFields_get as jest.Mock).mockResolvedValue(mockFields);

    const result = await feedFields_fetch();

    expect(salsa.feedFields_get).toHaveBeenCalled();
    expect(result).toEqual(mockFields);
  });

  it('should return null if salsa returns null', async () => {
    (salsa.feedFields_get as jest.Mock).mockResolvedValue(null);

    const result = await feedFields_fetch();

    expect(result).toBeNull();
  });
});
