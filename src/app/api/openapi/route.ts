import { NextResponse } from "next/server";

// Override these values in the OpenAPI spec
const SPEC_OVERRIDES = {
  info: {
    title: "Doubleword API",
    description: `The Doubleword Batched API lets you process thousands of LLM requests efficiently at a fraction of the cost of real-time inference.

**Why batch?**
- **Massive cost savings** — Our 24h SLA is substantially cheaper than real-time pricing
- **Flexible SLAs** — Choose 1h turnaround (at standard batch pricing) or 24h for maximum savings
- **Open-source models** — Access leading open-source models via an OpenAI-compatible API
- **Higher throughput** — Process large datasets without rate limit concerns

Upload a JSONL file with your requests, kick off a batch, and retrieve your results when ready. Perfect for bulk content generation, data processing, evaluations, and any workload that doesn't need instant responses.

[Get started →](https://app.doubleword.ai)`,
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
  const response = await fetch("https://api.doubleword.ai/openapi.json", {
    next: { revalidate: 3600 }, // Cache for 1 hour, then refetch
  });

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
