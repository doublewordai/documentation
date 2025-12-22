"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type {DocPageForNav} from '@/sanity/types';

type GroupedDocs = Record<string, {
  category: {
    _id: string;
    name: string;
    slug: {current: string};
    order: number;
  };
  docs: DocPageForNav[];
}>;

type SidebarNavProps = {
  productSlug: string;
  groupedDocs: GroupedDocs;
  apiReferenceHref?: string;
};

export default function SidebarNav({ productSlug, groupedDocs, apiReferenceHref }: SidebarNavProps) {
  const pathname = usePathname();

  // Sort categories by order
  const sortedCategories = Object.values(groupedDocs).sort(
    (a, b) => (a.category.order || 0) - (b.category.order || 0)
  );

  return (
    <nav className="space-y-6">
      {sortedCategories.map(({ category, docs }) => (
        <div key={category._id}>
          <h3
            className="text-xs font-semibold tracking-widest uppercase mb-2 px-2"
            style={{ color: 'var(--text-muted)' }}
          >
            {category.name}
          </h3>
          <ul className="space-y-0.5">
            {docs.map((doc) => {
              const href = `/${productSlug}/${doc.slug.current}`;
              const isActive = pathname === href;

              return (
                <li key={doc._id}>
                  <Link
                    href={href}
                    className={`block px-2 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                      isActive
                        ? ""
                        : "hover:translate-x-0.5"
                    }`}
                    style={
                      isActive
                        ? {
                            color: 'var(--foreground)',
                            backgroundColor: 'var(--hover-bg)',
                            textShadow: '0 0 0.5px currentColor'
                          }
                        : { color: 'var(--text-muted)' }
                    }
                  >
                    {doc.sidebarLabel || doc.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {/* API Reference Link */}
      {apiReferenceHref && (
        <div>
          <h3
            className="text-xs font-semibold tracking-widest uppercase mb-2 px-2"
            style={{ color: 'var(--text-muted)' }}
          >
            Reference
          </h3>
          <ul className="space-y-0.5">
            <li>
              <Link
                href={apiReferenceHref}
                className="flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-lg transition-all duration-200 hover:translate-x-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                API Reference
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-3 h-3 opacity-60"
                >
                  <path d="M4 12L12 4M12 4H6M12 4V10" />
                </svg>
              </Link>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}
