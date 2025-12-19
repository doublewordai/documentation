"use client";

import { useEffect, useState } from "react";

type Heading = {
  id: string;
  text: string;
  level: number;
};

export default function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

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

  if (headings.length === 0) return null;

  return (
    <nav className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto scrollbar-hide">
      <p
        className="text-xs 2xl:text-sm font-semibold tracking-wide mb-3"
        style={{ color: "var(--text-muted)" }}
      >
        On this page
      </p>
      <ul className="space-y-2 text-sm 2xl:text-base">
        {headings.map((heading) => {
          const isActive = activeId === heading.id;
          return (
            <li
              key={heading.id}
              style={{
                paddingLeft: heading.level === 3 ? "0.75rem" : "0",
              }}
            >
              <a
                href={`#${heading.id}`}
                className="block py-1 transition-all duration-200 hover:translate-x-0.5 cursor-default"
                style={{
                  color: isActive ? "var(--foreground)" : "var(--text-muted)",
                  textShadow: isActive ? "0 0 0.5px currentColor" : "none",
                }}
                onClick={(e) => {
                  e.preventDefault();
                  const element = document.getElementById(heading.id);
                  if (element) {
                    element.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                    // Update URL without jumping
                    window.history.pushState(null, "", `#${heading.id}`);
                  }
                }}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
