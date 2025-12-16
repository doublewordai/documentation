import { createClient } from "next-sanity";

export const client = createClient({
  projectId: "g1zo7y59",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
});
