import { ApiReference } from "@scalar/nextjs-api-reference";

const config = {
  spec: {
    url: "/api/openapi",
  },
  metaData: {
    title: "API Reference | Batches | Doubleword Docs",
    description: "Complete API reference for the Doubleword API",
  },
};

export const GET = ApiReference(config);
