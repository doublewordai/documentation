import Link from "next/link";
import type { Metadata } from "next";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import TableOfContents from "@/components/TableOfContents";
import ExpandableSearch from "@/components/ExpandableSearch";
import { getModelsIndexMarkdown } from "@/lib/model-artifacts";

export const metadata: Metadata = {
  title: "Models | Doubleword Docs",
  description: "Browse Doubleword model pricing and model-specific documentation.",
};

export default async function ModelsPage() {
  const content = await getModelsIndexMarkdown();

  return (
    <div className="relative w-full min-h-screen flex flex-col">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--sidebar-border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--sidebar-border) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
          opacity: 0.3,
          maskImage: "radial-gradient(ellipse at top, black 0%, transparent 50%)",
          WebkitMaskImage: "radial-gradient(ellipse at top, black 0%, transparent 50%)",
        }}
      />

      <div className="flex-1 w-full max-w-[1400px] 2xl:max-w-[2048px] relative px-4 sm:px-8 xl:px-12 2xl:pr-4 pt-8 mx-auto">
        <div className="flex items-start gap-16 2xl:gap-20">
          <div className="w-full max-w-2xl xl:max-w-3xl 2xl:max-w-4xl mx-auto xl:ml-auto xl:mr-0">
            <nav className="mb-6 flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <Link href="/" className="hover:text-[var(--foreground)] transition-colors">
                Docs
              </Link>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 opacity-50">
                <path d="M6 4l4 4-4 4" />
              </svg>
              <span style={{ color: "var(--foreground)" }}>Models</span>
            </nav>

            <article>
              <header className="mb-6">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
                  Models
                </h1>
              </header>
              <div className="prose max-w-none" data-enhance-footnotes data-enhance-code-tabs>
                <MarkdownRenderer content={content} />
              </div>
            </article>
          </div>

          <aside
            className="hidden xl:block sticky top-8 h-fit pt-8 z-10 toc-aside ml-auto flex-shrink-0 w-[280px] 2xl:w-[360px]"
            style={{ background: "var(--background)" }}
          >
            <div className="mb-4">
              <ExpandableSearch />
            </div>
            <TableOfContents />
          </aside>
        </div>
      </div>
    </div>
  );
}
