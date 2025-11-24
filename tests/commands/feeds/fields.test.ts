import { feeds_fields_do } from '../../../src/commands/feeds/fields';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/feeds/fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call salsa.feeds_fields_get and return fields', async () => {
    const mockFields = ['id', 'name', 'creation_date'];
    (salsa.feeds_fields_get as jest.Mock).mockResolvedValue(mockFields);

    const result = await feeds_fields_do();

    expect(salsa.feeds_fields_get).toHaveBeenCalled();
    expect(result).toEqual(mockFields);
  });

  it('should return null if salsa returns null', async () => {
    (salsa.feeds_fields_get as jest.Mock).mockResolvedValue(null);

    const result = await feeds_fields_do();

    expect(result).toBeNull();
  });
});
