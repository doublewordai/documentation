import { ApiReference } from "@scalar/nextjs-api-reference";
import { withCspNonce } from "@/lib/scalar-api-reference";

// Wrap Scalar's handler so its loader + init <script> tags carry our CSP nonce;
// otherwise `strict-dynamic` blocks them and the reference renders blank.
// See src/lib/scalar-api-reference.ts.
export const GET = withCspNonce(
  ApiReference({
    url: "/api/openapi",
    metaData: {
      title: "API Reference | Doubleword Inference API | Doubleword Docs",
      description: "Complete API reference for the Doubleword API",
    },
  }),
);
