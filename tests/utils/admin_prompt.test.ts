import { adminCredentials_prompt, adminCredentials_validate } from '../../src/utils/admin_prompt.js';
import * as readline from 'readline';

// Mock readline
jest.mock('readline');

describe('Admin Prompt', () => {
  let mockRL: any;
  let questionCallback: (answer: string) => void;
  let stdinListeners: Record<string, (data: Buffer) => void> = {};

  beforeEach(() => {
    stdinListeners = {};
    
    // Mock stdin
    const mockStdin = {
      isRaw: false,
      setRawMode: jest.fn(),
      resume: jest.fn(),
      pause: jest.fn(),
      removeListener: jest.fn(),
      on: jest.fn((event, callback) => {
        stdinListeners[event] = callback;
      }),
    };

    Object.defineProperty(process, 'stdin', {
      value: mockStdin,
      writable: true,
    });

    // Mock stdout
    Object.defineProperty(process, 'stdout', {
      value: {
        write: jest.fn(),
      },
      writable: true,
    });

    // Mock readline interface
    mockRL = {
      question: jest.fn((query, cb) => {
        questionCallback = cb;
      }),
      close: jest.fn(),
    };

    (readline.createInterface as jest.Mock).mockReturnValue(mockRL);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('validates credentials correctly', () => {
    expect(adminCredentials_validate({ username: 'user', password: 'pw' })).toBe(true);
    expect(adminCredentials_validate(null)).toBe(false);
    expect(adminCredentials_validate({ username: '', password: 'pw' })).toBe(false);
    expect(adminCredentials_validate({ username: 'user', password: '' })).toBe(false);
  });

  // Note: Testing the actual prompt interaction is tricky due to raw mode and stdin mocking
  // We'll focus on the validation logic which is more critical and deterministic here.
  // The prompt function relies heavily on process.stdin/stdout side effects.
});
