"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import SidebarNav from "./SidebarNav";
import ThemeToggle from "./ThemeToggle";
import AuthButton from "./AuthButton";
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
};

export default function MobileSidebar({
  productName,
  productSlug,
  groupedDocs,
}: MobileSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [enableAuth, setEnableAuth] = useState(false);

  useEffect(() => {
    // Check for ?auth=true query parameter
    const params = new URLSearchParams(window.location.search);
    setEnableAuth(params.get('auth') === 'true');
  }, []);

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
          href={`/${productSlug}`}
          className="hover:opacity-80 transition-opacity"
        >
          <Image
            src="/doubleword.svg"
            alt="Doubleword"
            width={120}
            height={28}
            priority
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
          w-64 overflow-y-auto fixed h-screen z-40 transition-transform duration-300
          top-14 lg:top-0
          lg:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          backgroundColor: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
        }}
      >
        <div className="p-6">
          <div className="hidden lg:flex items-center justify-between mb-8">
            <Link
              href={`/${productSlug}`}
              className="hover:opacity-80 transition-opacity"
            >
              <Image
                src="/doubleword.svg"
                alt="Doubleword"
                width={140}
                height={32}
                priority
              />
            </Link>
            <ThemeToggle />
          </div>

          <div onClick={() => setIsMobileMenuOpen(false)}>
            <SidebarNav productSlug={productSlug} groupedDocs={groupedDocs} />
          </div>

          {enableAuth && (
            <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
              <AuthButton />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
