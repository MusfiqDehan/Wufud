import { loadEnv } from "./env";

describe("deployment signing secrets", () => {
  it.each(["production", "staging"])("rejects defaults in %s", NODE_ENV => {
    expect(() => loadEnv({ NODE_ENV })).toThrow("distinct JWT secrets");
    expect(() => loadEnv({ NODE_ENV, JWT_ACCESS_SECRET: "a".repeat(32), JWT_REFRESH_SECRET: "a".repeat(32) })).toThrow();
    expect(loadEnv({ NODE_ENV, JWT_ACCESS_SECRET: "a".repeat(32), JWT_REFRESH_SECRET: "b".repeat(32) }).NODE_ENV).toBe(NODE_ENV);
  });
  it("allows local defaults for development", () => expect(loadEnv({}).NODE_ENV).toBe("development"));
});
