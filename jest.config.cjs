/** @type {import('ts-jest').JestConfigWithTsJest}
*/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Since we are using ES modules, we need to configure Jest to handle them
  transform: {
    '^.+\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  moduleNameMapper: {
    // Handle module aliases (if any) and ES module extensions
    '^(\.{1,2}/.*)\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
};
