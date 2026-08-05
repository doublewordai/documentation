// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  withConfig: vi.fn(),
}));

vi.mock("next/headers", () => ({
  draftMode: vi.fn(async () => ({ isEnabled: false })),
}));

vi.mock("next-sanity", () => ({
  createClient: vi.fn(() => ({
    fetch: mocks.fetch,
    withConfig: mocks.withConfig,
  })),
}));

describe("sanityFetch", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.fetch.mockReset().mockResolvedValue({});
    mocks.withConfig.mockReset();
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = "g1zo7y59";
    process.env.NEXT_PUBLIC_SANITY_DATASET = "production";
  });

  afterEach(() => {
    delete process.env.VERCEL_ENV;
  });

  it("does not cache published content in Vercel preview deployments", async () => {
    process.env.VERCEL_ENV = "preview";
    const { sanityFetch } = await import("./client");

    await sanityFetch({ query: "*[_type == $type]", tags: ["docPage"] });

    expect(mocks.fetch).toHaveBeenCalledWith(
      "*[_type == $type]",
      {},
      { cache: "no-store", next: undefined },
    );
  });

  it("keeps tag-based caching enabled in production", async () => {
    process.env.VERCEL_ENV = "production";
    const { sanityFetch } = await import("./client");

    await sanityFetch({ query: "*[_type == $type]", tags: ["docPage"] });

    expect(mocks.fetch).toHaveBeenCalledWith(
      "*[_type == $type]",
      {},
      {
        cache: "force-cache",
        next: { revalidate: false, tags: ["docPage"] },
      },
    );
  });
});
