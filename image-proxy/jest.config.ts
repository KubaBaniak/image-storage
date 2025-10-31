import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  testMatch: ['**/*.spec.ts', '**/*.test.ts'],

  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },

  transformIgnorePatterns: ['/node_modules/(?!(uuid|@faker-js)/)'],

  moduleFileExtensions: ['ts', 'js', 'json'],

  modulePathIgnorePatterns: ['dist'],
};

export default config;
