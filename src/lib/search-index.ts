import type { DocSearchIndexItem } from "@/sanity/types";
// Generated at build time by scripts/build-search-index.mjs, which the `build`
// script runs before `next build`. We import it STATICALLY (rather than reading
// it from disk at runtime) so webpack inlines the data into the /api/search
// function bundle. Runtime fs reads of a generated file are unreliable on
// Vercel — files in public/ are stripped from the function, traced files don't
// always land where process.cwd() expects, and an edge runtime has no fs at
// all. A static import sidesteps all of that. The committed file is an empty
// `[]` placeholder so dev / typecheck / lint resolve the module; the real build
// overwrites it before webpack compiles.
import searchIndex from "../../data/search-index.json";

export function loadSearchIndex(): DocSearchIndexItem[] {
  return searchIndex as DocSearchIndexItem[];
}
