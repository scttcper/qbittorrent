module.exports = {
  roots: ['<rootDir>'],
  reporters: ['default'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testEnvironment: 'node',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts$',
  moduleFileExtensions: ['ts', 'js'],
};
