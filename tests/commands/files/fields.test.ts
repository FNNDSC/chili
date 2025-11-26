import { fileFields_fetch } from '../../../src/commands/files/fields';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/files/fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call salsa.fileFields_get and return fields for default assetName', async () => {
    const mockFields = ['fname', 'fsize'];
    (salsa.fileFields_get as jest.Mock).mockResolvedValue(mockFields);

    const result = await fileFields_fetch();

    expect(salsa.fileFields_get).toHaveBeenCalledWith('files');
    expect(result).toEqual(mockFields);
  });

  it('should call salsa.fileFields_get with specified assetName', async () => {
    const mockFields = ['fname'];
    (salsa.fileFields_get as jest.Mock).mockResolvedValue(mockFields);

    const result = await fileFields_fetch('dirs');

    expect(salsa.fileFields_get).toHaveBeenCalledWith('dirs');
    expect(result).toEqual(mockFields);
  });

  it('should return null if salsa returns null', async () => {
    (salsa.fileFields_get as jest.Mock).mockResolvedValue(null);

    const result = await fileFields_fetch();

    expect(result).toBeNull();
  });
});
