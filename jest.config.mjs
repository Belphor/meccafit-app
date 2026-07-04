import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import("jest").Config} */
const config = {
  clearMocks: true,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/types/**",
  ],
  coverageDirectory: "coverage",
  testEnvironment: "node",
  testMatch: ["**/?(*.)+(test).ts?(x)"],
};

export default createJestConfig(config);
