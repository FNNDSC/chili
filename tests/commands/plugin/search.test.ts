import { plugin_search_do } from '../../../src/commands/plugin/search';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/plugin/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call salsa.plugins_searchableToIDs and return IDs', async () => {
    const mockIDs = ['123', '456'];
    (salsa.plugins_searchableToIDs as jest.Mock).mockResolvedValue(mockIDs);

    const result = await plugin_search_do('name:test');

    expect(salsa.plugins_searchableToIDs).toHaveBeenCalledWith('name:test');
    expect(result).toEqual(mockIDs);
  });

  it('should return null if salsa returns null', async () => {
    (salsa.plugins_searchableToIDs as jest.Mock).mockResolvedValue(null);

    const result = await plugin_search_do('name:none');

    expect(result).toBeNull();
  });
});
