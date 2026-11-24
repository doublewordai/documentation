import { afterEach, describe, expect, it, vi } from "vitest";

import { doublewordApiKey } from "./doubleword-api-key";

describe("doublewordApiKey", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers DOUBLEWORD_API_KEY", () => {
    vi.stubEnv("DOUBLEWORD_API_KEY", "new-key");
    vi.stubEnv("DOUBLEWORD_SYSTEM_API_KEY", "old-key");
    expect(doublewordApiKey()).toBe("new-key");
  });

  it("falls back to the old name while deployments still set it", () => {
    vi.stubEnv("DOUBLEWORD_API_KEY", "");
    vi.stubEnv("DOUBLEWORD_SYSTEM_API_KEY", "old-key");
    expect(doublewordApiKey()).toBe("old-key");
  });

  it("is undefined when neither is set", () => {
    vi.stubEnv("DOUBLEWORD_API_KEY", "");
    vi.stubEnv("DOUBLEWORD_SYSTEM_API_KEY", "");
    expect(doublewordApiKey()).toBeUndefined();
  });
});
