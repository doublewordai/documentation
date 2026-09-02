"use client";

import posthog from "posthog-js";

type GetStartedButtonProps = {
  className?: string;
  // Where the click originated, for conversion instrumentation.
  source?: string;
};

/**
 * Primary "Get started" CTA (CON-70). Coral pill linking to the app.
 * Styling: see `.cta-button` in globals.css (--cta-bg = hsl(355 92% 66%)).
 */
export default function GetStartedButton({
  className = "",
  source = "docs_header",
}: GetStartedButtonProps) {
  return (
    <a
      href="https://app.doubleword.ai"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => posthog.capture("cta_get_started_clicked", { source })}
      className={`cta-button inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-all active:scale-[0.98] ${className}`}
    >
      Get started
    </a>
  );
}
