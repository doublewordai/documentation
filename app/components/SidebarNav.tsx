"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Category = {
  _id: string;
  name: string;
  slug: string;
  order: number;
  parent?: { _id: string; name: string; order: number };
};

type Doc = {
  _id: string;
  title: string;
  slug: string;
  sidebarLabel?: string;
  category: Category;
};

type SidebarNavProps = {
  productSlug: string;
  groupedDocs: Record<string, { category: Category; docs: Doc[] }>;
};

export default function SidebarNav({ productSlug, groupedDocs }: SidebarNavProps) {
  const pathname = usePathname();

  // Sort categories by order
  const sortedCategories = Object.values(groupedDocs).sort(
    (a, b) => a.category.order - b.category.order
  );

  return (
    <nav className="space-y-6">
      {sortedCategories.map(({ category, docs }) => (
        <div key={category._id}>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            {category.name}
          </h3>
          <ul className="space-y-1">
            {docs.map((doc) => {
              const href = `/${productSlug}/${doc.slug}`;
              // Also match product root for overview page
              const isOverviewAtRoot = doc.slug === "overview" && pathname === `/${productSlug}`;
              const isActive = pathname === href || isOverviewAtRoot;

              return (
                <li key={doc._id}>
                  <Link
                    href={href}
                    className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive
                        ? "bg-blue-600 dark:bg-blue-600 text-white font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    {doc.sidebarLabel || doc.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
