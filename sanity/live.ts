import { client } from "./client";

export async function sanityFetch<T>({
  query,
  params = {},
}: {
  query: string;
  params?: Record<string, unknown>;
}) {
  return client.fetch<T>(query, params, {
    next: { revalidate: 60 }, // Revalidate every 60 seconds
  });
}
