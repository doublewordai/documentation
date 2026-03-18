import { NextResponse } from "next/server";

const SYSTEM_API_KEY = process.env.DOUBLEWORD_SYSTEM_API_KEY;

// Override these values in the OpenAPI spec
const SPEC_OVERRIDES = {
  info: {
    title: "Doubleword API",
    description: `The Doubleword Inference API lets you process thousands of LLM requests efficiently at a fraction of the cost of real-time inference.

**Why Doubleword?**
- **Massive cost savings** — Async and batch SLAs are substantially cheaper than real-time pricing
- **Flexible SLAs** — Choose async (1h turnaround) or batch (24h) for maximum savings
- **Open-source models** — Access leading open-source models via an OpenAI-compatible API
- **Higher throughput** — Process large datasets without rate limit concerns

Use the OpenAI-compatible API with the Autobatcher for drop-in async savings, or upload JSONL files for large-scale batch processing.

[Generate API key →](https://app.doubleword.ai/api-keys) · [Documentation →](https://docs.doubleword.ai/inference-api)`,
    version: "1.0.0",
  },
  servers: [
    {
      url: "https://api.doubleword.ai/v1",
      description: "Doubleword API",
    },
  ],
};

export async function GET() {
  if (!SYSTEM_API_KEY) {
    throw new Error("DOUBLEWORD_SYSTEM_API_KEY is not set");
  }

  const response = await fetch("https://api.doubleword.ai/openapi.json", {
    headers: {
      Authorization: `Bearer ${SYSTEM_API_KEY}`,
    },
    next: { revalidate: 3600 }, // Cache for 1 hour, then refetch
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`
    );
  }

  const spec = await response.json();

  // Apply overrides
  const modifiedSpec = {
    ...spec,
    ...SPEC_OVERRIDES,
  };

  return NextResponse.json(modifiedSpec, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
