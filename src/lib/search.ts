import type {DocSearchIndexItem, DocSearchResult} from "@/sanity/types";

export const MAX_RESULTS = 20;

export function normalize(text: string): string {
  return text.toLowerCase().trim();
}

export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerptAround(text: string, query: string, maxLength = 180): string {
  if (!text) return "";
  const normalizedText = normalize(text);
  const index = normalizedText.indexOf(normalize(query));
  if (index === -1) {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }

  const start = Math.max(0, index - Math.floor(maxLength / 3));
  const end = Math.min(text.length, start + maxLength);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

export function rankDoc(doc: DocSearchIndexItem, query: string): number {
  const q = normalize(query);
  const title = normalize(doc.title);
  const sidebarLabel = normalize(doc.sidebarLabel || "");
  const description = normalize(doc.description || "");
  const body = normalize(stripMarkdown(doc.body || ""));

  let score = 0;
  if (title === q) score += 120;
  if (title.startsWith(q)) score += 80;
  if (title.includes(q)) score += 60;
  if (sidebarLabel.includes(q)) score += 40;
  if (description.includes(q)) score += 30;
  if (body.includes(q)) score += 20;
  return score;
}

export function searchDocs(docs: DocSearchIndexItem[], query: string): DocSearchResult[] {
  const q = normalize(query);
  if (!q) return [];

  return docs
    .map((doc) => {
      const score = rankDoc(doc, q);
      if (score <= 0) return null;

      const bodyText = stripMarkdown(doc.body || "");
      const snippetSource = doc.description || bodyText;
      const snippet = excerptAround(snippetSource, q);
      return {...doc, score, snippet};
    })
    .filter((doc): doc is DocSearchResult => Boolean(doc))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS);
}
