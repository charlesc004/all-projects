module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  cacheDirectory: '<rootDir>/.cache/jest-integration',
  testMatch: ['**/test/*.spec.ts'],
  testTimeout: 30000,
};
