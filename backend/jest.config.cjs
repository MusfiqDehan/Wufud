/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: { "^.+\\.[jt]s$": "<rootDir>/../jest-transform.cjs" },
  transformIgnorePatterns: ["/node_modules/(?!.*uuid)"],
  collectCoverageFrom: ["**/*.(t|j)s"],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@shared/(.*)$": "<rootDir>/shared/$1",
    "^@wufud/contracts$": "<rootDir>/../../packages/contracts/src/index.ts",
  },
};
