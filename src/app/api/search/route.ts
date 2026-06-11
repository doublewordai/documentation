import {NextRequest, NextResponse} from "next/server";

const LIMIT_DEFAULT = 6;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  const productSlug = request.nextUrl.searchParams.get("product")?.trim() || "";
  const limitParam = Number(request.nextUrl.searchParams.get("limit") || LIMIT_DEFAULT);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 20) : LIMIT_DEFAULT;

  if (!query) {
    return NextResponse.json({matches: []});
  }

  try {
    // Imported inside the handler so a module-load failure (e.g. the JSON
    // import) is caught here and surfaced, rather than crashing the whole route
    // module with an empty-body 500 that tells us nothing.
    const {loadSearchIndex} = await import("@/lib/search-index");
    const {searchDocs} = await import("@/lib/search");

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
  } catch (err) {
    // TEMPORARY diagnostic: the route has been 500ing with an empty body on
    // Vercel, which hides the cause. Surface the real error in the response so
    // we can see it in the Network tab. Revert to a generic 500 once fixed.
    const e = err instanceof Error ? err : new Error(String(err));
    console.error("search route error:", e);
    return NextResponse.json(
      {
        error: e.name,
        message: e.message,
        stack: e.stack?.split("\n").slice(0, 8),
      },
      {status: 500},
    );
  }
}
