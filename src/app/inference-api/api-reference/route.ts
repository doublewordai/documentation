import { ApiReference } from "@scalar/nextjs-api-reference";
import { withCspNonce } from "@/lib/scalar-api-reference";

// Wrap Scalar's handler so its loader + init <script> tags carry our CSP nonce;
// otherwise `strict-dynamic` blocks them and the reference renders blank.
// See src/lib/scalar-api-reference.ts.
export const GET = withCspNonce(
  ApiReference({
    url: "/api/openapi",
    // Scalar otherwise loads its default web fonts from Google Fonts, which our
    // `font-src 'self' data:` CSP blocks ("Refused to load the font"). Use the
    // system font stack instead of allowlisting an external font host.
    withDefaultFonts: false,
    metaData: {
      title: "API Reference | Doubleword Inference API | Doubleword Docs",
      description: "Complete API reference for the Doubleword API",
    },
  }),
);
