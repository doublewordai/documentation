/**
 * Synthesized in-repo "Regional endpoints" page.
 *
 * Doc content normally lives in Sanity (see AGENTS.md), but this page is the
 * link target of the API's wrong-region 401 error copy, so its content is
 * version-controlled here alongside the URL contract. It renders through the
 * same pipeline as other synthesized pages (see model-artifacts.ts).
 *
 * If this page is ever migrated into Sanity under the same slug, remove the
 * hooks in [product]/[...slug]/page.tsx, the markdown API route,
 * inference-api-sidebar.ts, and sitemap.ts — the sidebar already prefers a
 * Sanity page with this slug if one exists.
 */

export const REGIONAL_ENDPOINTS_SLUG = "regional-endpoints";
export const REGIONAL_ENDPOINTS_TITLE = "Regional endpoints";
export const REGIONAL_ENDPOINTS_DESCRIPTION =
  "Doubleword's Global and US regions: API base URLs, consoles, region-bound API keys, and why a key from the wrong region is rejected with a 401.";

export function getRegionalEndpointsMarkdown(): string {
  return `Doubleword runs in two regions: **Global**, served by \`https://api.doubleword.ai/v1\`, and **US**, served by \`https://api.us.doubleword.ai/v1\`. Each region is a separate deployment with its own console, accounts, API keys, and credits.

| Region | API base URL | Console |
|--------|--------------|---------|
| Global | \`https://api.doubleword.ai/v1\` | [app.doubleword.ai](https://app.doubleword.ai) |
| US | \`https://api.us.doubleword.ai/v1\` | [app.us.doubleword.ai](https://app.us.doubleword.ai) |

The US console shows a region badge in the header, so you can always tell which region you are signed in to.

## API keys are region-bound

An API key belongs to the region it was created in and only works against that region's base URL. Keys carry no region prefix or any other regional marker, so you cannot tell a key's region from the key string itself.

Because of that, always pair a key with its base URL: when you store a key, record the region it came from and configure the matching base URL alongside it.

\`\`\`bash
# A key created in the Global console pairs with the Global base URL
export DOUBLEWORD_BASE_URL="https://api.doubleword.ai/v1"
export DOUBLEWORD_API_KEY="{{apiKey}}"

# A key created in the US console pairs with the US base URL
export DOUBLEWORD_BASE_URL="https://api.us.doubleword.ai/v1"
export DOUBLEWORD_API_KEY="<key created in the US console>"
\`\`\`

## A wrong-region key surfaces as a plain 401

Sending a key to the other region's endpoint returns a standard \`401\` authentication error — the same response an invalid or deleted key gets:

\`\`\`json
{
  "error": {
    "message": "Invalid API key. API keys are region-bound: if you expected this key to work, check that your base URL matches the region the key was created in. See https://docs.doubleword.ai/inference-api/regional-endpoints",
    "type": "authentication_error",
    "code": "invalid_api_key"
  }
}
\`\`\`

If you hit a \`401\` with a key you believe is valid:

1. Check which base URL your client is configured with.
2. Check which console the key was created in. The US console shows a region badge in the header; if there is no badge, you are in the Global console.
3. If the key belongs to the other region, either point your client at that region's base URL or [create a new key](https://docs.doubleword.ai/inference-api/creating-an-api-key) in the region you want to use.
`;
}
