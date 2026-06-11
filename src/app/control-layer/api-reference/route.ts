import { ApiReference } from "@scalar/nextjs-api-reference";
import { withCspNonce } from "@/lib/scalar-api-reference";

// Wrap Scalar's handler so its loader + init <script> tags carry our CSP nonce;
// otherwise `strict-dynamic` blocks them and the reference renders blank.
// See src/lib/scalar-api-reference.ts.
export const GET = withCspNonce(
  ApiReference({
    url: "/api/control-layer-openapi",
    // Scalar loads its default web fonts from Google Fonts for BOTH the
    // Inference and Control Layer references — independent of the Test Request
    // button (hidden here) — and our `font-src 'self' data:` CSP blocks them.
    // Use the system font stack instead of allowlisting an external font host.
    // Keep this even though hideTestRequestButton is true.
    withDefaultFonts: false,
    metaData: {
      title: "API Reference | Control Layer | Doubleword Docs",
      description: "Complete API reference for the Doubleword Control Layer API",
    },
    hideTestRequestButton: true,
  }),
);
