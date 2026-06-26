"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {PRODUCT_TABS} from "@/lib/product-nav";

type ProductTabsProps = {
  activeProductSlug: string;
};

// Fixed header strip. Height is h-12 (48px); it sits below the 56px mobile
// header bar (top-14) and at the very top on desktop (xl:top-0). These offsets
// are kept in lockstep with the <main> padding in [product]/layout.tsx and the
// sidebar <aside> offsets in MobileSidebar.tsx — change all three together.
export default function ProductTabs({activeProductSlug}: ProductTabsProps) {
  const pathname = usePathname();
  // Derive active section from the URL so the highlight updates instantly on
  // click, falling back to the layout-provided slug on first render / reload.
  const active = pathname?.split("/")[1] || activeProductSlug;

  return (
    <nav
      className="fixed left-0 right-0 z-50 h-12 top-14 xl:top-0 flex items-stretch gap-1 px-3 sm:px-4 overflow-x-auto"
      style={{
        backgroundColor: "var(--sidebar-bg)",
        borderBottom: "1px solid var(--sidebar-border)",
      }}
      aria-label="Product sections"
    >
      {PRODUCT_TABS.map((tab) => {
        const isActive = tab.slug === active;
        return (
          <Link
            key={tab.slug}
            href={`/${tab.slug}`}
            aria-current={isActive ? "page" : undefined}
            className="flex items-center px-3 text-sm font-medium whitespace-nowrap transition-colors"
            style={{
              color: isActive ? "var(--foreground)" : "var(--text-muted)",
              borderBottom: isActive
                ? "2px solid var(--link-color)"
                : "2px solid transparent",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
