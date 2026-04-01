import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import TableOfContents from "@/components/TableOfContents";
import ExpandableSearch from "@/components/ExpandableSearch";
import {
  getModelArtifact,
  getModelArtifacts,
  renderModelArtifactMarkdown,
} from "@/lib/model-artifacts";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const artifacts = await getModelArtifacts();
  return artifacts.map((artifact) => ({ slug: artifact.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artifact = await getModelArtifact(slug);

  if (!artifact) {
    return { title: "Not Found" };
  }

  return {
    title: `${artifact.name} | Models | Doubleword Docs`,
    description:
      artifact.pricing[0]
        ? `${artifact.name} pricing and usage notes for Doubleword.`
        : `${artifact.name} model details for Doubleword.`,
  };
}

export default async function ModelArtifactPage({ params }: Props) {
  const { slug } = await params;
  const artifact = await getModelArtifact(slug);

  if (!artifact) {
    notFound();
  }

  const content = renderModelArtifactMarkdown(artifact);

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
              <Link href="/models" className="hover:text-[var(--foreground)] transition-colors">
                Models
              </Link>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 opacity-50">
                <path d="M6 4l4 4-4 4" />
              </svg>
              <span className="truncate" style={{ color: "var(--foreground)" }}>
                {artifact.name}
              </span>
            </nav>

            <article>
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
