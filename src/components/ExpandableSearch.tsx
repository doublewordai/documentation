"use client";

import {useRouter} from "next/navigation";
import {KeyboardEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState} from "react";

function highlightMatches(text: string, query: string): ReactNode {
  if (!query.trim()) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.trim().toLowerCase() ? (
      <mark
        key={i}
        style={{
          background: "rgba(255, 214, 10, 0.35)",
          color: "inherit",
          padding: "0 0.05em",
          borderRadius: "0.15em",
        }}
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

const DEBOUNCE_MS = 220;
const MIN_QUERY_LENGTH = 2;

type Match = {
  id: string;
  title: string;
  productName: string;
  categoryName: string;
  snippet: string;
  score: number;
  href: string;
  path: string;
};

type Props = {
  /** When true, renders as an icon that expands on click. When false, renders as a full input. */
  expandable?: boolean;
  /** When true (with expandable), expands as a fixed full-width bar instead of widening in place. */
  fullWidthExpand?: boolean;
  /** Scope search to a specific product. */
  productSlug?: string;
  className?: string;
};

export default function ExpandableSearch({expandable = false, fullWidthExpand = false, productSlug, className}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [expanded, setExpanded] = useState(!expandable);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [originPath, setOriginPath] = useState<string | null>(null);

  const topMatch = useMemo(() => matches[0] || null, [matches]);

  const collapse = useCallback(() => {
    setDropdownOpen(false);
    setMatches([]);
    setActiveIndex(0);
    if (expandable) {
      setExpanded(false);
      setQuery("");
    }
  }, [expandable]);

  function goTo(href: string) {
    if (!originPath) {
      setOriginPath(window.location.pathname + window.location.search);
    }
    setDropdownOpen(false);
    setQuery("");
    if (expandable) setExpanded(false);
    router.push(href);
  }

  function clearSearch() {
    setQuery("");
    setMatches([]);
    setDropdownOpen(false);
    setActiveIndex(0);
    if (originPath) {
      const target = originPath;
      setOriginPath(null);
      router.push(target);
    }
  }

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    const timer = setTimeout(async () => {
      if (trimmed.length < MIN_QUERY_LENGTH) {
        setMatches([]);
        setDropdownOpen(false);
        setActiveIndex(0);
        return;
      }

      const productParam = productSlug ? `&product=${encodeURIComponent(productSlug)}` : "";
      const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=6${productParam}`);
      if (!response.ok) return;
      const data = (await response.json()) as {matches: Match[]};
      setMatches(data.matches || []);
      setDropdownOpen(true);
      setActiveIndex(0);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, productSlug]);

  // Focus on expand
  useEffect(() => {
    if (!expandable || !expanded) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [expandable, expanded]);

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({block: "nearest"});
  }, [activeIndex]);

  // Click outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        collapse();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [collapse]);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      collapse();
      return;
    }

    if (!dropdownOpen || matches.length === 0) {
      if (event.key === "Enter" && topMatch) {
        event.preventDefault();
        goTo(topMatch.href);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % matches.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const selected = matches[activeIndex] || topMatch;
      if (selected) goTo(selected.href);
    }
  }

  const placeholder = productSlug ? "Search all pages" : "Search docs";

  const dropdown = dropdownOpen && query.trim().length >= MIN_QUERY_LENGTH && (
    <div
      className="absolute mt-2 rounded-lg overflow-hidden z-50"
      style={{
        right: 0,
        width: expandable ? 400 : "100%",
        border: "1px solid var(--sidebar-border)",
        background: "var(--sidebar-bg)",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.12)",
      }}
    >
      {matches.length === 0 ? (
        <p className="px-3 py-2 text-sm" style={{color: "var(--text-muted)"}}>
          No matches.
        </p>
      ) : (
        <ul ref={listRef} className="max-h-80 overflow-y-auto">
          {matches.map((match, index) => {
            const isActive = index === activeIndex;
            return (
              <li key={match.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => goTo(match.href)}
                  className="w-full text-left px-3 py-2.5 border-b last:border-b-0 transition-colors"
                  style={{
                    borderColor: "var(--sidebar-border)",
                    background: isActive ? "var(--hover-bg)" : "transparent",
                  }}
                >
                  <p className="text-sm font-medium truncate" style={{color: "var(--foreground)"}}>
                    {highlightMatches(match.title, query)}
                  </p>
                  <p className="text-[11px] font-mono tabular-nums" style={{color: "var(--text-muted)"}}>
                    {match.path}
                  </p>
                  {match.snippet && (
                    <p className="text-xs mt-0.5 line-clamp-2" style={{color: "var(--text-muted)"}}>
                      {highlightMatches(match.snippet, query)}
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  // Expandable variant (full-width takeover): icon that opens a fixed bar across the top
  if (expandable && fullWidthExpand) {
    return (
      <>
        <button
          onClick={() => setExpanded(true)}
          className={`flex items-center justify-center w-7 h-7 ${className ?? ""}`}
          style={{color: "var(--text-muted)"}}
          aria-label="Search docs"
          type="button"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M13 13L17 17" />
          </svg>
        </button>
        {expanded && (
          <div
            ref={wrapperRef}
            className="fixed top-0 left-0 right-0 h-14 z-[60] flex items-center gap-3 px-4 animate-[fadeIn_50ms_ease-out]"
            style={{background: "var(--sidebar-bg)", borderBottom: "1px solid var(--sidebar-border)"}}
          >
            <svg
              className="w-4 h-4 shrink-0"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              style={{color: "var(--text-muted)"}}
            >
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="M13 13L17 17" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (matches.length > 0) setDropdownOpen(true); }}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              autoComplete="off"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{color: "var(--foreground)"}}
            />
            <button
              type="button"
              onClick={collapse}
              className="flex items-center justify-center shrink-0 w-7 h-7"
              style={{color: "var(--text-muted)"}}
              aria-label="Close search"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
            {dropdown}
          </div>
        )}
      </>
    );
  }

  // Expandable variant (inline widen): icon that smoothly widens into an input
  if (expandable) {
    return (
      <div ref={wrapperRef} className={`relative ${className ?? ""}`}>
        <div
          className="flex items-center rounded-lg overflow-hidden transition-all duration-200 ease-out"
          style={{
            width: expanded ? 240 : 28,
            background: expanded ? "var(--sidebar-bg)" : "transparent",
            border: expanded ? "1px solid var(--sidebar-border)" : "1px solid transparent",
          }}
        >
          <button
            onClick={() => expanded ? (query.trim() ? undefined : collapse()) : setExpanded(true)}
            className="flex items-center justify-center shrink-0 w-7 h-7"
            style={{color: "var(--text-muted)"}}
            aria-label="Search docs"
            type="button"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="M13 13L17 17" />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (matches.length > 0) setDropdownOpen(true); }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            tabIndex={expanded ? 0 : -1}
            autoComplete="off"
            className="bg-transparent text-sm outline-none py-1 pr-2"
            style={{
              color: "var(--foreground)",
              width: expanded ? "calc(100% - 28px)" : 0,
              opacity: expanded ? 1 : 0,
              transition: "opacity 150ms ease-out",
            }}
          />
        </div>
        {expanded && dropdown}
      </div>
    );
  }

  // Inline variant: always-visible input
  return (
    <div className={`relative ${className ?? ""}`} ref={wrapperRef}>
      <div
        className="flex items-center gap-2 py-1"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="w-4 h-4 shrink-0"
          style={{color: "var(--text-muted)"}}
        >
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="M13 13L17 17" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (matches.length > 0) setDropdownOpen(true); }}
          onKeyDown={onKeyDown}
          autoComplete="off"
          className="w-full bg-transparent text-sm 2xl:text-base outline-none"
          style={{color: "var(--foreground)"}}
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="shrink-0 p-0.5 rounded transition-colors hover:text-[var(--foreground)]"
            style={{color: "var(--text-muted)"}}
            aria-label="Clear search"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        )}
      </div>
      {dropdown}
    </div>
  );
}
