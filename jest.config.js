module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.test.(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Map ESM-only modules to our manual mocks for Jest
  moduleNameMapper: {
    '^@google/genai$': '<rootDir>/__mocks__/@google/genai.js'
  },
  // In some environments we may need to increase the default timeout
  testTimeout: 10000
};
