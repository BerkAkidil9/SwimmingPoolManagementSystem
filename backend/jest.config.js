module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/integration/'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'routes/**/*.js',
    'validations.js',
    'register.js',
    '!**/node_modules/**',
  ],
  setupFilesAfterEnv: [],
  testTimeout: 10000,
};
