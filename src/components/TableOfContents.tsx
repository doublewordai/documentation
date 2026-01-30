"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import posthog from "posthog-js";

type Heading = {
  id: string;
  text: string;
  level: number;
};

type TocSection = {
  h2: Heading;
  h3s: Heading[];
};

export default function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [autoExpanded, setAutoExpanded] = useState<Set<string>>(new Set());
  const [manuallyExpanded, setManuallyExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Extract headings from the page
    const elements = Array.from(
      document.querySelectorAll("article h2, article h3")
    );
    // Filter out headings inside footnotes section
    const filteredElements = elements.filter(
      (elem) => !elem.closest(".footnotes-section")
    );
    const headingData = filteredElements.map((elem) => ({
      id: elem.id,
      text: elem.textContent || "",
      level: parseInt(elem.tagName[1]),
    }));
    setHeadings(headingData);

    // Set up intersection observer for active heading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-100px 0px -66%" }
    );

    filteredElements.forEach((elem) => observer.observe(elem));

    return () => observer.disconnect();
  }, []);

  // Group headings into sections (H2 + its H3 children)
  const sections = useMemo((): TocSection[] => {
    const result: TocSection[] = [];
    let currentSection: TocSection | null = null;

    for (const heading of headings) {
      if (heading.level === 2) {
        if (currentSection) {
          result.push(currentSection);
        }
        currentSection = { h2: heading, h3s: [] };
      } else if (heading.level === 3 && currentSection) {
        currentSection.h3s.push(heading);
      }
    }

    if (currentSection) {
      result.push(currentSection);
    }

    return result;
  }, [headings]);

  // Find which H2 section contains the active heading
  const activeH2Id = useMemo(() => {
    for (const section of sections) {
      if (section.h2.id === activeId) return section.h2.id;
      if (section.h3s.some((h3) => h3.id === activeId)) return section.h2.id;
    }
    return "";
  }, [sections, activeId]);

  // Auto-expand current section, keep previous, collapse others (debounced)
  useEffect(() => {
    if (!activeH2Id) return;

    // Immediately expand the current section (no delay for opening)
    setAutoExpanded((prev) => {
      if (prev.has(activeH2Id)) return prev;
      return new Set([...prev, activeH2Id]);
    });

    // Debounce the collapse of other sections
    const timer = setTimeout(() => {
      const currentIndex = sections.findIndex((s) => s.h2.id === activeH2Id);
      if (currentIndex === -1) return;

      const sectionsToKeepOpen = new Set<string>();

      // Current section
      sectionsToKeepOpen.add(activeH2Id);

      // Previous section (if exists)
      if (currentIndex > 0) {
        sectionsToKeepOpen.add(sections[currentIndex - 1].h2.id);
      }

      setAutoExpanded(sectionsToKeepOpen);
    }, 400);

    return () => clearTimeout(timer);
  }, [activeH2Id, sections]);

  // Combine auto and manual expanded sections
  const expandedSections = useMemo(() => {
    return new Set([...autoExpanded, ...manuallyExpanded]);
  }, [autoExpanded, manuallyExpanded]);

  const toggleSection = useCallback((h2Id: string) => {
    setManuallyExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(h2Id)) {
        next.delete(h2Id);
      } else {
        next.add(h2Id);
      }
      return next;
    });
  }, []);

  const handleLinkClick = useCallback((e: React.MouseEvent, heading: Heading) => {
    e.preventDefault();
    e.stopPropagation();
    const element = document.getElementById(heading.id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      window.history.pushState(null, "", `#${heading.id}`);

      posthog.capture("toc_link_clicked", {
        heading_id: heading.id,
        heading_text: heading.text,
        heading_level: heading.level,
        page_path: window.location.pathname,
      });
    }
  }, []);

  if (headings.length === 0) return null;

  return (
    <nav className="max-h-[calc(100vh-16rem)] scrollbar-subtle">
      <p
        className="text-xs font-semibold tracking-widest uppercase mb-3"
        style={{ color: "var(--text-muted)" }}
      >
        On this page
      </p>
      <ul className="space-y-1 text-sm 2xl:text-base">
        {sections.map((section) => {
          const isH2Active = activeId === section.h2.id;
          const isSectionActive = activeH2Id === section.h2.id;
          const isExpanded = expandedSections.has(section.h2.id);
          const hasChildren = section.h3s.length > 0;

          return (
            <li key={section.h2.id}>
              {/* H2 heading with optional toggle */}
              <div className="flex items-center justify-between gap-1">
                <a
                  href={`#${section.h2.id}`}
                  className="block py-1 transition-colors duration-150 hover:translate-x-0.5"
                  style={{
                    color: isH2Active || isSectionActive ? "var(--foreground)" : "var(--text-muted)",
                    fontWeight: isH2Active ? 500 : 400,
                  }}
                  onClick={(e) => handleLinkClick(e, section.h2)}
                >
                  {section.h2.text}
                </a>
                {hasChildren && (
                  <button
                    onClick={() => toggleSection(section.h2.id)}
                    className="p-1 flex-shrink-0 transition-transform duration-150"
                    style={{
                      color: "var(--text-muted)",
                      transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    }}
                    aria-label={isExpanded ? "Collapse section" : "Expand section"}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4.5 2.5L8 6L4.5 9.5" />
                    </svg>
                  </button>
                )}
              </div>

              {/* H3 children with animated expand/collapse */}
              {hasChildren && (
                <div
                  className="grid transition-[grid-template-rows,opacity] duration-200 ease-out"
                  style={{
                    gridTemplateRows: isExpanded ? "1fr" : "0fr",
                    opacity: isExpanded ? 1 : 0,
                  }}
                >
                  <div className="overflow-hidden">
                    <ul className="ml-5 mt-1 space-y-1">
                      {section.h3s.map((h3) => {
                        const isH3Active = activeId === h3.id;
                        return (
                          <li key={h3.id}>
                            <a
                              href={`#${h3.id}`}
                              className="block py-1 transition-colors duration-150 hover:translate-x-0.5"
                              style={{
                                color: isH3Active ? "var(--foreground)" : "var(--text-muted)",
                                fontWeight: isH3Active ? 500 : 400,
                              }}
                              onClick={(e) => handleLinkClick(e, h3)}
                            >
                              {h3.text}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
