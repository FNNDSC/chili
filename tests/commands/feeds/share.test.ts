import { feeds_share_do } from '../../../src/commands/feeds/share';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/feeds/share', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call salsa.feeds_share with correct id and options', async () => {
    (salsa.feeds_share as jest.Mock).mockResolvedValue(true);

    const feedId = 123;
    const options = { is_public: true };
    const result = await feeds_share_do(feedId, options);

    expect(salsa.feeds_share).toHaveBeenCalledWith(feedId, options);
    expect(result).toBe(true);
  });

  it('should return false if salsa.feeds_share fails', async () => {
    (salsa.feeds_share as jest.Mock).mockResolvedValue(false);

    const feedId = 123;
    const options = { is_public: false };
    const result = await feeds_share_do(feedId, options);

    expect(result).toBe(false);
  });
});
