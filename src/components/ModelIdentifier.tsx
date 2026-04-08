"use client";

import { useState } from "react";

type ModelIdentifierProps = {
  value: string;
};

export default function ModelIdentifier({ value }: ModelIdentifierProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="mb-6 rounded-xl border px-4 py-3 flex items-center justify-between gap-3"
      style={{
        borderColor: "var(--sidebar-border)",
        backgroundColor: "var(--hover-bg)",
      }}
    >
      <div className="min-w-0">
        <p
          className="text-xs font-semibold tracking-widest uppercase mb-1"
          style={{ color: "var(--text-muted)" }}
        >
          Model Name
        </p>
        <code
          className="text-sm sm:text-base break-all"
          style={{ color: "var(--foreground)" }}
        >
          {value}
        </code>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 p-2 rounded-lg transition-colors hover:bg-[var(--sidebar-bg)]"
        aria-label={copied ? "Copied model name" : "Copy model name"}
        title={copied ? "Copied" : "Copy model name"}
      >
        {copied ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
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
        )}
      </button>
    </div>
  );
}
