module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.test.(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Map ESM-only modules to our manual mocks for Jest
  moduleNameMapper: {
    '^@google-cloud/vertexai$': '<rootDir>/__mocks__/@google-cloud/vertexai.js'
  },
  // In some environments we may need to increase the default timeout
  testTimeout: 10000,
  // Handle ESM modules better
  extensionsToTreatAsEsm: ['.ts', '.tsx']
};
