import {NextRequest, NextResponse} from "next/server";
import {loadSearchIndex} from "@/lib/search-index";
import {searchDocs} from "@/lib/search";

const LIMIT_DEFAULT = 6;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  const productSlug = request.nextUrl.searchParams.get("product")?.trim() || "";
  const limitParam = Number(request.nextUrl.searchParams.get("limit") || LIMIT_DEFAULT);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 20) : LIMIT_DEFAULT;

  if (!query) {
    return NextResponse.json({matches: []});
  }

  const allDocs = loadSearchIndex();
  const docs = productSlug
    ? allDocs.filter((d) => d.productSlug === productSlug)
    : allDocs;

  const matches = searchDocs(docs, query)
    .slice(0, limit)
    .map((result) => ({
      id: result._id,
      title: result.sidebarLabel || result.title,
      productName: result.productName,
      categoryName: result.categoryName || "",
      snippet: result.snippet,
      score: result.score,
      href: `/${result.productSlug}/${result.slug}`,
      path: `/${result.productSlug}/${result.slug}`,
    }));

  return NextResponse.json({matches});
}
