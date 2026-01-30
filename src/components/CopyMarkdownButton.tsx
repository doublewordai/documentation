'use client';

import { useState } from 'react';
import posthog from 'posthog-js';

export default function CopyMarkdownButton() {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopy = async () => {
    setLoading(true);
    try {
      const mdUrl = `${window.location.pathname}.md`;
      const response = await fetch(mdUrl);
      if (!response.ok) throw new Error('Failed to fetch markdown');
      const markdown = await response.text();

      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      posthog.capture('markdown_copied', {
        page_path: window.location.pathname,
        content_length: markdown.length,
      });
    } catch (error) {
      console.error('Failed to copy markdown:', error);
      posthog.captureException(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCopy}
      disabled={loading}
      className="flex items-center gap-2 py-1 transition-all duration-200 hover:translate-x-0.5 text-sm 2xl:text-base disabled:opacity-50 w-full"
      style={{
        color: 'var(--text-muted)',
      }}
      aria-label="Copy page as markdown"
      title="Copy page as markdown"
    >
      {copied ? (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Copied</span>
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>{loading ? 'Loading...' : 'Copy Markdown'}</span>
        </>
      )}
    </button>
  );
}
