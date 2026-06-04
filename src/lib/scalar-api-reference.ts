import { headers } from "next/headers";

// Match the *opening* tag of a <script> element that does not already carry a
// `nonce` attribute. `(?=[\s>])` keeps us off closing `</script>` tags (and any
// attribute that merely contains the text "script"); `(?![^>]*\snonce=)` makes
// stamping idempotent and a no-op for scripts that are already nonced — e.g. if
// Scalar ever emits its own — instead of producing invalid duplicate `nonce`
// attributes. The match is case-sensitive, which is sufficient because Scalar
// emits lowercase `<script>` tags.
const UNNONCED_SCRIPT_OPEN_TAG = /<script(?=[\s>])(?![^>]*\snonce=)/g;

/**
 * Stamp the per-request CSP nonce onto the `<script>` tags of a hand-built HTML
 * response.
 *
 * Scalar's Next.js adapter (`ApiReference`) returns an HTML document and writes
 * its own loader + init `<script>` tags. Because Next.js never renders those
 * tags, it cannot stamp our nonce onto them — the same gotcha the anti-FOUC
 * script in app/layout.tsx works around by setting `nonce` explicitly. Under our
 * `script-src 'self' 'nonce-…' 'strict-dynamic'` policy, an un-nonced script is
 * ignored by the browser, so the reference never boots and the page renders
 * blank.
 *
 * Wrapping the handler restores rendering while keeping the strict CSP fully
 * intact: no `'unsafe-inline'`, no `'unsafe-eval'`, no host allowlisting — the
 * XSS-containment control is unchanged. Stamping is safe because the wrapped
 * document is fully static (Scalar's own loader + init scripts only); no request-
 * or user-derived markup is rendered into it (the OpenAPI spec is fetched
 * client-side from a same-origin URL, never embedded here), so there is no path
 * for untrusted content to receive a nonce.
 *
 * The nonce is forwarded by middleware.ts on the `x-nonce` request header. If it
 * is absent (middleware did not run, so there is also no CSP), the response is
 * returned unchanged.
 */
export function withCspNonce(
  handler: () => Response | Promise<Response>,
): () => Promise<Response> {
  return async function GET() {
    const response = await handler();

    const nonce = (await headers()).get("x-nonce");
    if (!nonce) {
      return response;
    }

    const html = (await response.text()).replace(
      UNNONCED_SCRIPT_OPEN_TAG,
      `<script nonce="${nonce}"`,
    );

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-length"); // body length changed after stamping
    return new Response(html, {
      status: response.status,
      headers: responseHeaders,
    });
  };
}
