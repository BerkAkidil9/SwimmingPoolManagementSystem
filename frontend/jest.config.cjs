module.exports = {
  roots: ['<rootDir>/src'],
  testEnvironment: 'jsdom',
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  setupFiles: ['<rootDir>/test/polyfills.cjs'],
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.js'],
  transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': '<rootDir>/test/styleMock.cjs',
    '\\.(gif|ttf|eot|svg|png|jpe?g|webp|ico|woff2?)$': '<rootDir>/test/fileMock.cjs',
  },
  clearMocks: true,
};
