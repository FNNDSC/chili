import { feed_create } from '../../../src/commands/feed/create';
import * as salsa from '@fnndsc/salsa';
import * as cumin from '@fnndsc/cumin';

jest.mock('@fnndsc/salsa');
jest.mock('@fnndsc/cumin', () => ({
  ...jest.requireActual('@fnndsc/cumin'),
  dictionary_fromCLI: jest.fn()
}));

describe('commands/feed/create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call salsa.feed_create with parsed params and dirs', async () => {
    const mockFeedInfo = { id: 1, name: 'new-feed' };
    const mockParsedParams = { title: 'My Feed' };
    (cumin.dictionary_fromCLI as jest.Mock).mockReturnValue(mockParsedParams);
    (salsa.feed_create as jest.Mock).mockResolvedValue(mockFeedInfo);

    const options = { params: 'title:My Feed', dirs: '/path/to/data' };
    const result = await feed_create(options);

    expect(cumin.dictionary_fromCLI).toHaveBeenCalledWith('title:My Feed');
    expect(salsa.feed_create).toHaveBeenCalledWith(['/path/to/data'], mockParsedParams);
    expect(result).toEqual(mockFeedInfo);
  });

  it('should throw error if dirs are not provided', async () => {
    const options = { params: 'title:My Feed' };
    await expect(feed_create(options)).rejects.toThrow('Directories for feed creation are required');
  });

  it('should throw error if parsing params fails', async () => {
    (cumin.dictionary_fromCLI as jest.Mock).mockImplementation(() => {
      throw new Error('Parsing failed');
    });

    const options = { params: 'invalid', dirs: '/data' };
    await expect(feed_create(options)).rejects.toThrow('Error parsing feed parameters: Error: Parsing failed');
  });

  it('should return null if salsa.feed_create fails', async () => {
    (salsa.feed_create as jest.Mock).mockResolvedValue(null);
    const options = { dirs: '/data' };
    const result = await feed_create(options);
    expect(result).toBeNull();
  });
});
