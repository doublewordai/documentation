"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DocPageForNav } from "@/sanity/types";

type GroupedDocs = Record<
  string,
  {
    category: {
      _id: string;
      name: string;
      slug: { current: string };
      order: number;
    };
    docs: DocPageForNav[];
  }
>;

type SidebarNavProps = {
  productSlug: string;
  groupedDocs: GroupedDocs;
};

export default function SidebarNav({
  productSlug,
  groupedDocs,
}: SidebarNavProps) {
  const pathname = usePathname();

  // Track which collapsible sections are open
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    // Initialize with sections that contain the current path
    const initial = new Set<string>();
    Object.values(groupedDocs).forEach(({ docs }) => {
      docs.forEach((doc) => {
        const href = `/${productSlug}/${doc.slug.current}`;
        // If current path starts with this doc's path, it might be a parent
        if (pathname.startsWith(href + "/") || pathname === href) {
          // Check if this doc has children
          const hasChildren = docs.some(
            (d) => d.parentSlug === doc.slug.current,
          );
          if (hasChildren) {
            initial.add(doc.slug.current);
          }
          // Also open parent if we're on a child page
          if (doc.parentSlug) {
            initial.add(doc.parentSlug);
          }
        }
      });
    });
    return initial;
  });

  const toggleSection = (slug: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  // Sort categories by order
  const sortedCategories = Object.values(groupedDocs).sort(
    (a, b) => (a.category.order || 0) - (b.category.order || 0),
  );

  return (
    <nav className="space-y-6">
      {sortedCategories.map(({ category, docs }) => {
        // Separate root docs (no parent) from child docs
        const rootDocs = docs.filter((doc) => !doc.parentSlug);
        const childDocsByParent = docs.reduce(
          (acc, doc) => {
            if (doc.parentSlug) {
              if (!acc[doc.parentSlug]) {
                acc[doc.parentSlug] = [];
              }
              acc[doc.parentSlug].push(doc);
            }
            return acc;
          },
          {} as Record<string, DocPageForNav[]>,
        );

        return (
          <div key={category._id}>
            <h3
              className="text-xs font-semibold tracking-widest uppercase mb-2 px-2"
              style={{ color: "var(--text-muted)" }}
            >
              {category.name}
            </h3>
            <ul className="space-y-0.5">
              {rootDocs.map((doc) => {
                const href = `/${productSlug}/${doc.slug.current}`;
                const isActive = pathname === href;
                const children = childDocsByParent[doc.slug.current] || [];
                const hasChildren = children.length > 0;
                const isOpen = openSections.has(doc.slug.current);
                const isChildActive = children.some(
                  (child) =>
                    pathname === `/${productSlug}/${child.slug.current}`,
                );

                if (hasChildren) {
                  return (
                    <li key={doc._id}>
                      <div className="flex items-center">
                        <Link
                          href={href}
                          className={`flex-1 flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                            isActive ? "" : "hover:translate-x-0.5"
                          }`}
                          style={
                            isActive
                              ? {
                                  color: "var(--foreground)",
                                  backgroundColor: "var(--hover-bg)",
                                  textShadow: "0 0 0.5px currentColor",
                                }
                              : { color: "var(--text-muted)" }
                          }
                        >
                          {doc.sidebarLabel || doc.title}
                          {doc.externalLinkIcon && (
                            <svg
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="w-3 h-3 opacity-60"
                            >
                              <path d="M4 12L12 4M12 4H6M12 4V10" />
                            </svg>
                          )}
                        </Link>
                        <button
                          onClick={() => toggleSection(doc.slug.current)}
                          className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
                          aria-label={
                            isOpen ? "Collapse section" : "Expand section"
                          }
                        >
                          <svg
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={`w-3 h-3 transition-transform duration-200 ${
                              isOpen ? "rotate-90" : ""
                            }`}
                            style={{ color: "var(--text-muted)" }}
                          >
                            <path d="M6 4l4 4-4 4" />
                          </svg>
                        </button>
                      </div>
                      {/* Child pages */}
                      <ul
                        className={`ml-3 pl-2 border-l space-y-0.5 overflow-hidden transition-all duration-200 ${
                          isOpen
                            ? "max-h-96 opacity-100 mt-0.5"
                            : "max-h-0 opacity-0"
                        }`}
                        style={{ borderColor: "var(--sidebar-border)" }}
                      >
                        {children.map((child) => {
                          const childHref = `/${productSlug}/${child.slug.current}`;
                          const isChildItemActive = pathname === childHref;

                          return (
                            <li key={child._id}>
                              <Link
                                href={childHref}
                                className={`flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                                  isChildItemActive
                                    ? ""
                                    : "hover:translate-x-0.5"
                                }`}
                                style={
                                  isChildItemActive
                                    ? {
                                        color: "var(--foreground)",
                                        backgroundColor: "var(--hover-bg)",
                                        textShadow: "0 0 0.5px currentColor",
                                      }
                                    : { color: "var(--text-muted)" }
                                }
                              >
                                {child.sidebarLabel || child.title}
                                {child.externalLinkIcon && (
                                  <svg
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="w-3 h-3 opacity-60"
                                  >
                                    <path d="M4 12L12 4M12 4H6M12 4V10" />
                                  </svg>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                }

                return (
                  <li key={doc._id}>
                    <Link
                      href={href}
                      className={`flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                        isActive ? "" : "hover:translate-x-0.5"
                      }`}
                      style={
                        isActive
                          ? {
                              color: "var(--foreground)",
                              backgroundColor: "var(--hover-bg)",
                              textShadow: "0 0 0.5px currentColor",
                            }
                          : { color: "var(--text-muted)" }
                      }
                    >
                      {doc.sidebarLabel || doc.title}
                      {doc.externalLinkIcon && (
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="w-3 h-3 opacity-60"
                        >
                          <path d="M4 12L12 4M12 4H6M12 4V10" />
                        </svg>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
