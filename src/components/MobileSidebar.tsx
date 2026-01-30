"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import SidebarNav from "./SidebarNav";
import ThemeToggle from "./ThemeToggle";
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

type MobileSidebarProps = {
  productName: string;
  productSlug: string;
  groupedDocs: GroupedDocs;
  apiReferenceHref?: string;
};

export default function MobileSidebar({
  productName,
  productSlug,
  groupedDocs,
  apiReferenceHref,
}: MobileSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Mobile header bar */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14"
        style={{ backgroundColor: 'var(--sidebar-bg)', borderBottom: '1px solid var(--sidebar-border)' }}
      >
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 -ml-2 rounded-lg"
          aria-label="Toggle menu"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: 'var(--foreground)' }}
          >
            {isMobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

        <Link
          href="/"
          className="hover:opacity-80 transition-opacity"
        >
          <Image
            src="/logo-full-black.png"
            alt="Doubleword"
            width={120}
            height={28}
            priority
            className="logo-light"
            style={{ height: 'auto' }}
          />
          <Image
            src="/logo-full-white.png"
            alt="Doubleword"
            width={120}
            height={28}
            priority
            className="logo-dark"
            style={{ height: 'auto' }}
          />
        </Link>

        <ThemeToggle />
      </header>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          w-64 overflow-y-auto fixed z-40 transition-transform duration-300
          top-14 bottom-0 lg:top-0 lg:h-screen
          lg:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          backgroundColor: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
          overscrollBehavior: 'contain',
        }}
      >
        <div className="p-6">
          <div className="hidden lg:flex items-center justify-between mb-8">
            <Link
              href="/"
              className="hover:opacity-80 transition-opacity"
            >
              <Image
                src="/logo-full-black.png"
                alt="Doubleword"
                width={140}
                height={32}
                priority
                className="logo-light"
                style={{ height: 'auto' }}
              />
              <Image
                src="/logo-full-white.png"
                alt="Doubleword"
                width={140}
                height={32}
                priority
                className="logo-dark"
                style={{ height: 'auto' }}
              />
            </Link>
            <ThemeToggle />
          </div>

          <div onClick={() => setIsMobileMenuOpen(false)}>
            <SidebarNav productSlug={productSlug} groupedDocs={groupedDocs} apiReferenceHref={apiReferenceHref} />
          </div>
        </div>
      </aside>
    </>
  );
}
