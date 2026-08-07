import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("model page redirects", () => {
  it("preserves model pages whose canonical slug now comes from the API alias", async () => {
    const redirects = await nextConfig.redirects?.();

    expect(redirects).toEqual(
      expect.arrayContaining([
        {
          source: "/inference-api/models/qwen-qwen3-5-9b-dotjson",
          destination: "/inference-api/models/qwen-qwen3-5-9b-dottxt",
          permanent: true,
        },
        {
          source: "/inference-api/models/qwen-qwen3-5-9b-dotjson.md",
          destination: "/inference-api/models/qwen-qwen3-5-9b-dottxt.md",
          permanent: true,
        },
        {
          source: "/inference-api/models/qwen-qwen3-5-35b-a3b-fp8-dotjson",
          destination:
            "/inference-api/models/qwen-qwen3-5-35b-a3b-fp8-dottxt",
          permanent: true,
        },
        {
          source:
            "/inference-api/models/qwen-qwen3-5-35b-a3b-fp8-dotjson.md",
          destination:
            "/inference-api/models/qwen-qwen3-5-35b-a3b-fp8-dottxt.md",
          permanent: true,
        },
        {
          source: "/inference-api/models/qwen-qwen3-5-397b-a17b",
          destination: "/inference-api/models/qwen-qwen3-5-397b-a17b-fp8",
          permanent: true,
        },
        {
          source: "/inference-api/models/qwen-qwen3-5-397b-a17b.md",
          destination:
            "/inference-api/models/qwen-qwen3-5-397b-a17b-fp8.md",
          permanent: true,
        },
      ]),
    );
  });
});
