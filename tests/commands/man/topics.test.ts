import { topics_list } from '../../../src/commands/man/topics';
import * as renderer from '../../../src/man/renderer';
import fs from 'fs';

jest.mock('fs');
jest.mock('../../../src/man/renderer');

describe('commands/man/topics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (renderer.projectDir_get as jest.Mock).mockReturnValue('/test/project');
  });

  it('should return list of adoc files', async () => {
    (fs.readdirSync as jest.Mock).mockReturnValue(['topic1.adoc', 'topic2.adoc', 'image.png']);
    
    const result = await topics_list();

    expect(result).toEqual([' topic1', ' topic2']);
  });
});
