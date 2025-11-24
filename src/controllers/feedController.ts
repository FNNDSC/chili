import {
  ChRISFeedGroup,
  ChRISFeed,
  SimpleRecord,
  params_fromOptions,
  ChRISObjectParams
} from "@fnndsc/cumin";
import { BaseController } from "./baseController.js";
import { CLIoptions } from "../utils/cli.js";

/**
 * Controller for managing ChRIS feeds.
 * Handles feed creation, sharing, and other feed-specific operations.
 */
export class FeedController extends BaseController {
  constructor(chrisObject: ChRISFeedGroup) {
    super(chrisObject);
  }

  /**
   * Factory method to create a new FeedController.
   *
   * @returns A new FeedController instance.
   */
  static controller_create(): FeedController {
    const chrisFeedGroup = new ChRISFeedGroup();
    return new FeedController(chrisFeedGroup);
  }

  /**
   * Shares feeds based on CLI options.
   *
   * @param options - CLI options for sharing.
   * @returns A Promise resolving to void.
   */
  async feeds_share(options: CLIoptions): Promise<void> {
    // Placeholder logic
    return Promise.resolve();
  }

  /**
   * Creates a new feed from directories.
   *
   * @param options - CLI options containing 'dirs' and other feed params.
   * @returns A Promise resolving to the created feed's SimpleRecord or null.
   */
  async feed_create(options: CLIoptions): Promise<SimpleRecord | null> {
    const chrisFeed: ChRISFeed = new ChRISFeed();
    try {
      const dirs = options.dirs as string;
      const feedParams = params_fromOptions({ ...options, returnFilter: "params" }) as ChRISObjectParams;
      return await chrisFeed.createFromDirs(dirs, feedParams);
    } catch (error) {
        // Logging handled by cumin errorStack or caller
      return null;
    }
  }
}
