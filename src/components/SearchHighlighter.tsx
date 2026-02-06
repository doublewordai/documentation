"use client";

import {useEffect} from "react";

type SearchHighlighterProps = {
  query: string;
};

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clearPreviousMarks() {
  document.querySelectorAll("mark[data-search-highlight='true']").forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
    parent.normalize();
  });
}

const FADE_DURATION_MS = 1500;

export default function SearchHighlighter({query}: SearchHighlighterProps) {
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    clearPreviousMarks();

    const prose = document.querySelector(".prose");
    if (!prose) return;

    const walker = document.createTreeWalker(prose, NodeFilter.SHOW_TEXT);
    const pattern = new RegExp(escapeRegExp(trimmed), "i");
    let firstMatchElement: Element | null = null;
    const marks: HTMLElement[] = [];

    while (walker.nextNode()) {
      const textNode = walker.currentNode as Text;
      const value = textNode.nodeValue || "";
      const match = pattern.exec(value);
      if (!match || !textNode.parentElement) continue;

      const before = value.slice(0, match.index);
      const matched = value.slice(match.index, match.index + match[0].length);
      const after = value.slice(match.index + match[0].length);

      const fragment = document.createDocumentFragment();
      if (before) fragment.appendChild(document.createTextNode(before));

      const mark = document.createElement("mark");
      mark.dataset.searchHighlight = "true";
      mark.style.background = "var(--hover-bg)";
      mark.style.color = "inherit";
      mark.style.padding = "0.1em 0.15em";
      mark.style.borderRadius = "0.2em";
      mark.style.transition = `background ${FADE_DURATION_MS}ms ease-out`;
      mark.textContent = matched;
      fragment.appendChild(mark);
      marks.push(mark);

      if (after) fragment.appendChild(document.createTextNode(after));

      textNode.parentNode?.replaceChild(fragment, textNode);
      if (!firstMatchElement) firstMatchElement = mark;
    }

    if (firstMatchElement) {
      firstMatchElement.scrollIntoView({behavior: "smooth", block: "center"});
    }

    // Fade out highlights after a brief pause
    const fadeTimer = setTimeout(() => {
      marks.forEach((mark) => {
        mark.style.background = "transparent";
      });
    }, 600);

    // Clean up marks after fade completes
    const cleanupTimer = setTimeout(() => {
      clearPreviousMarks();
    }, 600 + FADE_DURATION_MS + 100);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(cleanupTimer);
      clearPreviousMarks();
    };
  }, [query]);

  return null;
}
