import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DocSearchIndexItem } from "@/sanity/types";

let cached: DocSearchIndexItem[] | null = null;

export function loadSearchIndex(): DocSearchIndexItem[] {
  if (cached) return cached;
  const filePath = join(process.cwd(), ".next", "cache", "search-index.json");
  const data: DocSearchIndexItem[] = JSON.parse(readFileSync(filePath, "utf-8"));
  cached = data;
  return data;
}
