import { NextResponse } from "next/server";

const SYSTEM_API_KEY = process.env.DOUBLEWORD_SYSTEM_API_KEY;

// Override these values in the OpenAPI spec
const SPEC_OVERRIDES = {
  info: {
    title: "Doubleword Control Layer API",
    description: `API reference for the Doubleword Control Layer. This documents the Admin API for your self-hosted Control Layer deployment.

**Key features:**
- **User management** — Manage users, teams, and permissions
- **API key administration** — Create and manage API keys programmatically
- **Usage tracking** — Monitor usage and costs across your organization
- **Model configuration** — Configure model access and routing

For interactive API testing, use the built-in Scalar UI at \`/admin/docs\` on your deployment.

[← Back to documentation](https://docs.doubleword.ai/control-layer)`,
    version: "1.0.0",
  },
  servers: [
    {
      url: "https://<your-host>/admin/api/v1",
      description: "Your Control Layer deployment",
    },
  ],
};

export async function GET() {
  if (!SYSTEM_API_KEY) {
    throw new Error("DOUBLEWORD_SYSTEM_API_KEY is not set");
  }

  const response = await fetch("https://app.doubleword.ai/admin/openapi.json", {
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
