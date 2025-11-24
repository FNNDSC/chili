import { files_fields_do } from '../../../src/commands/files/fields';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/files/fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call salsa.files_fields_get and return fields for default assetName', async () => {
    const mockFields = ['fname', 'fsize'];
    (salsa.files_fields_get as jest.Mock).mockResolvedValue(mockFields);

    const result = await files_fields_do();

    expect(salsa.files_fields_get).toHaveBeenCalledWith('files');
    expect(result).toEqual(mockFields);
  });

  it('should call salsa.files_fields_get with specified assetName', async () => {
    const mockFields = ['fname'];
    (salsa.files_fields_get as jest.Mock).mockResolvedValue(mockFields);

    const result = await files_fields_do('dirs');

    expect(salsa.files_fields_get).toHaveBeenCalledWith('dirs');
    expect(result).toEqual(mockFields);
  });

  it('should return null if salsa returns null', async () => {
    (salsa.files_fields_get as jest.Mock).mockResolvedValue(null);

    const result = await files_fields_do();

    expect(result).toBeNull();
  });
});
