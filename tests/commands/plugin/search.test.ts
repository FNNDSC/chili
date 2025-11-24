import { plugin_search } from '../../../src/commands/plugin/search';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/plugin/search', () => {
  it('should call salsa.plugins_searchableToIDs', async () => {
    (salsa.plugins_searchableToIDs as jest.Mock).mockResolvedValue(['1']);
    
    const result = await plugin_search('name:test');

    expect(salsa.plugins_searchableToIDs).toHaveBeenCalledWith('name:test');
    expect(result).toEqual(['1']);
  });

  it('should return null if salsa returns null', async () => {
    (salsa.plugins_searchableToIDs as jest.Mock).mockResolvedValue(null);

    const result = await plugin_search('name:none');

    expect(result).toBeNull();
  });
});
