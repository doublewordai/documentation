import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

// Pull the CSP off the response middleware emits for a normal document request.
function cspFor(
  url = "https://docs.doubleword.ai/inference-api/api-reference",
): string {
  const res = middleware(new NextRequest(url));
  return res.headers.get("content-security-policy") ?? "";
}

// Return the directive (e.g. "connect-src ...") as a single trimmed string.
function directive(csp: string, name: string): string {
  return (
    csp
      .split(";")
      .map((d) => d.trim())
      .find((d) => d === name || d.startsWith(`${name} `)) ?? ""
  );
}

describe("CSP middleware", () => {
  it("allows the inference API host so Scalar's Test Request works", () => {
    // The OpenAPI spec's server is https://api.doubleword.ai/v1, so Scalar fires
    // its try-it fetch at that host from the browser. Without this entry the
    // request is blocked and the user sees "Failed to fetch".
    expect(directive(cspFor(), "connect-src")).toContain(
      "https://api.doubleword.ai",
    );
  });

  it("keeps the other connect-src allowances intact", () => {
    const connectSrc = directive(cspFor(), "connect-src");
    expect(connectSrc).toContain("'self'"); // PostHog via /ingest rewrite
    expect(connectSrc).toContain("https://app.doubleword.ai"); // SSO session check
    expect(connectSrc).toContain("https://status.doubleword.ai"); // StatusWidget
  });

  it("does not allowlist a font host — fonts stay self/data only", () => {
    // We fixed the Scalar font violation by disabling its default fonts, not by
    // opening font-src. Guard against a future regression that re-opens it.
    expect(directive(cspFor(), "font-src")).toBe("font-src 'self' data:");
  });

  it("emits a per-request nonce in script-src", () => {
    expect(cspFor()).toMatch(/script-src[^;]*'nonce-[^']+'/);
  });

  it("uses a unique nonce per response", () => {
    const first = cspFor().match(/'nonce-([^']+)'/)?.[1];
    const second = cspFor().match(/'nonce-([^']+)'/)?.[1];
    expect(first).toBeTruthy();
    expect(first).not.toBe(second);
  });
});
