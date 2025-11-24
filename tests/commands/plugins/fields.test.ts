import { plugins_fieldsGet } from '../../../src/commands/plugins/fields';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/plugins/fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call salsa.plugins_fields_get and return fields', async () => {
    const mockFields = ['id', 'name', 'version'];
    (salsa.plugins_fields_get as jest.Mock).mockResolvedValue(mockFields);

    const result = await plugins_fieldsGet();

    expect(salsa.plugins_fields_get).toHaveBeenCalled();
    expect(result).toEqual(mockFields);
  });

  it('should return null if salsa returns null', async () => {
    (salsa.plugins_fields_get as jest.Mock).mockResolvedValue(null);

    const result = await plugins_fieldsGet();

    expect(result).toBeNull();
  });
});
