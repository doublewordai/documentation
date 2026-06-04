import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiReference } from "@scalar/nextjs-api-reference";

// Mutable nonce so individual tests can simulate "middleware ran" vs "no nonce".
const mock = vi.hoisted(() => ({ nonce: null as string | null }));

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers(mock.nonce ? { "x-nonce": mock.nonce } : {}),
}));

import { withCspNonce } from "./scalar-api-reference";

const NONCE = "test-nonce-Zm9vYmFy";

const htmlHandler = (body: string) => () =>
  new Response(body, { headers: { "Content-Type": "text/html" } });

describe("withCspNonce", () => {
  beforeEach(() => {
    mock.nonce = NONCE;
  });

  it("stamps the nonce onto every <script> tag of the real Scalar handler", async () => {
    const GET = withCspNonce(ApiReference({ url: "/api/openapi" }));
    const html = await (await GET()).text();

    const openingTags = html.match(/<script(?=[\s>])/g) ?? [];
    const noncedTags =
      html.match(new RegExp(`<script nonce="${NONCE}"(?=[\\s>])`, "g")) ?? [];

    // Scalar emits at least a CDN loader and an inline init script; strict-dynamic
    // blocks any that lack the nonce.
    expect(openingTags.length).toBeGreaterThanOrEqual(2);
    expect(noncedTags.length).toBe(openingTags.length);
    expect(html).toContain(
      `<script nonce="${NONCE}" src="https://cdn.jsdelivr.net`,
    );
  });

  it("nonces opening tags exactly, leaving closing tags and content type intact", async () => {
    const res = await withCspNonce(
      htmlHandler(
        `<html><body><script src="x.js"></script><script>boot()</script></body></html>`,
      ),
    )();
    const html = await res.text();

    expect(html).toBe(
      `<html><body><script nonce="${NONCE}" src="x.js"></script>` +
        `<script nonce="${NONCE}">boot()</script></body></html>`,
    );
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("returns the response unchanged when no nonce is present", async () => {
    mock.nonce = null;
    const html = await (
      await withCspNonce(htmlHandler(`<script src="x.js"></script>`))()
    ).text();

    // No CSP means nothing to stamp; fall back to the handler's raw output.
    expect(html).toBe(`<script src="x.js"></script>`);
    expect(html).not.toContain("nonce=");
  });
});
