"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DocPageForNav } from "@/sanity/types";
import type { ExternalDocsGroup } from "@/lib/external-docs";

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
  externalDocGroups?: ExternalDocsGroup[];
  onNavigate?: () => void;
  collapseCategoriesByDefault?: boolean;
  defaultOpenCategoryIds?: string[];
};

export default function SidebarNav({
  productSlug,
  groupedDocs,
  externalDocGroups = [],
  onNavigate,
  collapseCategoriesByDefault = false,
  defaultOpenCategoryIds = [],
}: SidebarNavProps) {
  const pathname = usePathname();
  const getHref = (doc: DocPageForNav) => doc.href || `/${productSlug}/${doc.slug.current}`;
  const opensInNewTab = (categorySlug: string, doc: DocPageForNav) =>
    categorySlug === "bottom-links" &&
    (doc.slug.current === "dw-cli" || doc.slug.current === "api-reference");
  const getItemStyle = (isActive: boolean) =>
    isActive
      ? {
          color: "var(--foreground)",
          backgroundColor: "var(--hover-bg)",
          textShadow: "0 0 0.5px currentColor",
        }
      : { color: "var(--text-muted)" };
  const allCategoryGroups = [
    ...Object.values(groupedDocs),
    ...externalDocGroups.flatMap((group) => group.categories),
  ];

  // Track which collapsible sections are open
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    Object.values(groupedDocs).forEach(({ docs }) => {
      const childParentSlugs = new Set(
        docs.filter((doc) => doc.parentSlug).map((doc) => doc.parentSlug as string),
      );

      docs.forEach((doc) => {
        const href = getHref(doc);
        const isCurrentDoc = pathname.startsWith(href + "/") || pathname === href;

        if (!isCurrentDoc) {
          return;
        }

        if (doc.parentSlug) {
          initial.add(doc.parentSlug);
        }

        if (childParentSlugs.has(doc.slug.current)) {
          initial.add(doc.slug.current);
        }
      });
    });
    return initial;
  });
  const [openExternalGroups, setOpenExternalGroups] = useState<Set<string>>(
    () => {
      const initial = new Set<string>();

      externalDocGroups.forEach((group) => {
        const hasActiveDoc = group.categories.some(({ docs }) =>
          docs.some((doc) => pathname === `/${productSlug}/${doc.slug.current}`),
        );

        if (hasActiveDoc) {
          initial.add(group.id);
        }
      });

      return initial;
    },
  );
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => {
    if (!collapseCategoriesByDefault) {
      return new Set(allCategoryGroups.map(({category}) => category._id));
    }
    return new Set<string>(defaultOpenCategoryIds);
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

  const toggleExternalGroup = (groupId: string) => {
    setOpenExternalGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Sort categories by order
  const sortedCategories = Object.values(groupedDocs).sort(
    (a, b) => (a.category.order || 0) - (b.category.order || 0),
  );

  const renderCategoryList = (
    docsByCategory: Array<{
      category: {
        _id: string;
        name: string;
        slug: { current: string };
        order: number;
      };
      docs: DocPageForNav[];
    }>,
  ) =>
    docsByCategory.map(({ category, docs }) => {
      const isCategoryOpen = openCategories.has(category._id);
      const rootDocs = docs.filter((doc) => !doc.parentSlug);
      const isUnsectionedCategory = category.slug.current === "bottom-links";
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

      if (isUnsectionedCategory) {
        return (
          <div key={category._id}>
            <ul className="space-y-0.5">
              {rootDocs.map((doc) => {
                const resolvedHref = getHref(doc);
                const isActive = pathname === resolvedHref;
                const openInNewTab = opensInNewTab(category.slug.current, doc);

                return (
                  <li key={doc._id}>
                    <Link
                      href={resolvedHref}
                      onClick={onNavigate}
                      target={openInNewTab ? "_blank" : undefined}
                      rel={openInNewTab ? "noreferrer" : undefined}
                      className="flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-lg transition-all duration-200 hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
                      style={getItemStyle(isActive)}
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
      }

      return (
        <div key={category._id}>
          {collapseCategoriesByDefault ? (
            <button
              type="button"
              onClick={() => toggleCategory(category._id)}
              className="w-full mb-2 px-2 flex items-center justify-between text-left"
            >
              <span
                className="text-xs font-semibold tracking-widest uppercase"
                style={{ color: "var(--text-muted)" }}
              >
                {category.name}
              </span>
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`w-3 h-3 transition-transform duration-200 ${
                  isCategoryOpen ? "rotate-90" : ""
                }`}
                style={{ color: "var(--text-muted)" }}
              >
                <path d="M6 4l4 4-4 4" />
              </svg>
            </button>
          ) : category.name ? (
            <h3
              className="text-xs font-semibold tracking-widest uppercase mb-2 px-2"
              style={{ color: "var(--text-muted)" }}
            >
              {category.name}
            </h3>
          ) : null}
          {isCategoryOpen && (
            <ul className="space-y-0.5">
              {rootDocs.map((doc) => {
                const href = `/${productSlug}/${doc.slug.current}`;
                const resolvedHref = getHref(doc);
                const isActive = pathname === resolvedHref;
                const children = childDocsByParent[doc.slug.current] || [];
                const hasChildren = children.length > 0;
                const isOpen = openSections.has(doc.slug.current);
                const isChildActive = children.some(
                  (child) =>
                    pathname === getHref(child),
                );

                if (hasChildren) {
                  return (
                    <li key={doc._id}>
                      <div className="group flex items-center">
                          <Link
                          href={resolvedHref}
                          onClick={onNavigate}
                          className="flex-1 flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-lg transition-all duration-200 hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
                          style={getItemStyle(isActive)}
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
                          className="p-1.5 rounded-lg opacity-70 group-hover:opacity-100 hover:bg-[var(--hover-bg)] transition-all duration-200"
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
                            ? "max-h-[200rem] opacity-100 mt-0.5"
                            : "max-h-0 opacity-0"
                        }`}
                        style={{ borderColor: "var(--sidebar-border)" }}
                      >
                        {children.map((child) => {
                          const childHref = getHref(child);
                          const isChildItemActive = pathname === childHref;

                          return (
                            <li key={child._id}>
                              <Link
                                href={childHref}
                                onClick={onNavigate}
                                className="flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-lg transition-all duration-200 hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
                                style={getItemStyle(isChildItemActive)}
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
                      href={resolvedHref}
                      onClick={onNavigate}
                      className="flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-lg transition-all duration-200 hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
                      style={getItemStyle(isActive)}
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
          )}
        </div>
      );
    });

  return (
    <nav className="space-y-6">
      {renderCategoryList(sortedCategories)}
      {externalDocGroups.map((group) => {
        if (!group.title) {
          return (
            <div key={group.id} className="space-y-6">
              {renderCategoryList(group.categories)}
            </div>
          );
        }

        const isOpen = openExternalGroups.has(group.id);

        return (
          <div
            key={group.id}
            className="space-y-4 pt-2 border-t"
            style={{ borderColor: "var(--sidebar-border)" }}
          >
            <button
              type="button"
              onClick={() => toggleExternalGroup(group.id)}
              className="w-full px-2 flex items-center justify-between text-left"
            >
              <span
                className="text-[11px] font-semibold tracking-[0.18em] uppercase"
                style={{ color: "var(--foreground)" }}
              >
                {group.title}
              </span>
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
            {isOpen && <div className="space-y-6">{renderCategoryList(group.categories)}</div>}
          </div>
        );
      })}
    </nav>
  );
}
