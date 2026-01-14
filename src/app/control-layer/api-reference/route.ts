import { ApiReference } from "@scalar/nextjs-api-reference";

const config = {
  spec: {
    url: "/api/control-layer-openapi",
  },
  metaData: {
    title: "API Reference | Control Layer | Doubleword Docs",
    description: "Complete API reference for the Doubleword Control Layer API",
  },
  hideTestRequestButton: true,
};

export const GET = ApiReference(config);
