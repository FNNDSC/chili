import { feed_shareById } from '../../../src/commands/feeds/share';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/feeds/share', () => {
  it('should call salsa.feeds_share with the provided feedId and options', async () => {
    (salsa.feeds_share as jest.Mock).mockResolvedValue(true);
    const mockOptions = { is_public: true };
    const result = await feed_shareById(123, mockOptions);
    expect(salsa.feeds_share).toHaveBeenCalledWith(123, mockOptions);
    expect(result).toBe(true);
  });
});
