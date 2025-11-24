import { feed_create_do } from '../../../src/commands/feed/create';
import * as salsa from '@fnndsc/salsa';
import * as cumin from '@fnndsc/cumin';

jest.mock('@fnndsc/salsa');
jest.mock('@fnndsc/cumin', () => ({
  ...jest.requireActual('@fnndsc/cumin'),
  CLI_toDictionary: jest.fn()
}));

describe('commands/feed/create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call salsa.feed_create with parsed params and dirs', async () => {
    const mockFeedInfo = { id: 1, name: 'new-feed' };
    const mockParsedParams = { title: 'My Feed' };
    (cumin.CLI_toDictionary as jest.Mock).mockReturnValue(mockParsedParams);
    (salsa.feed_create as jest.Mock).mockResolvedValue(mockFeedInfo);

    const options = { params: 'title:My Feed', dirs: '/path/to/data' };
    const result = await feed_create_do(options);

    expect(cumin.CLI_toDictionary).toHaveBeenCalledWith('title:My Feed');
    expect(salsa.feed_create).toHaveBeenCalledWith(['/path/to/data'], mockParsedParams);
    expect(result).toEqual(mockFeedInfo);
  });

  it('should throw error if dirs are not provided', async () => {
    const options = { params: 'title:My Feed' };
    await expect(feed_create_do(options)).rejects.toThrow('Directories for feed creation are required');
  });

  it('should throw error if parsing params fails', async () => {
    (cumin.CLI_toDictionary as jest.Mock).mockImplementation(() => {
      throw new Error('Parsing failed');
    });

    const options = { params: 'invalid', dirs: '/data' };
    await expect(feed_create_do(options)).rejects.toThrow('Error parsing feed parameters: Error: Parsing failed');
  });

  it('should return null if salsa.feed_create fails', async () => {
    (salsa.feed_create as jest.Mock).mockResolvedValue(null);
    const options = { dirs: '/data' };
    const result = await feed_create_do(options);
    expect(result).toBeNull();
  });
});
