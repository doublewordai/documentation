"use client";

import { useState } from "react";
import Link from "next/link";
import {
  getModelArtifactPath,
  type ModelArtifact,
  type ModelArtifactPricingRow,
} from "@/lib/model-artifacts";

const PRICING_TIERS = ["Realtime", "Async", "Batch (24h)"] as const;

function displayPrice(price: string): string {
  return price.replace(/^\\/, "");
}

function PricingCell({
  row,
  showCacheRead,
}: {
  row?: ModelArtifactPricingRow;
  showCacheRead: boolean;
}) {
  if (!row) return <span aria-label="Unavailable">—</span>;

  const hasCacheRead = showCacheRead && row.cacheReadPricePer1M !== undefined;
  const inputPrice = `${displayPrice(row.inputTokensPer1M)} in`;
  const outputPrice = `${displayPrice(row.outputTokensPer1M)} out`;

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1 whitespace-nowrap">
      <span
        className={hasCacheRead ? "line-through opacity-45" : undefined}
      >
        {inputPrice}
      </span>
      {hasCacheRead && (
        <span className="font-semibold" style={{ color: "#16a34a" }}>
          {displayPrice(row.cacheReadPricePer1M!)} in
        </span>
      )}
      <span aria-hidden="true">/</span>
      <span>{outputPrice}</span>
    </span>
  );
}

export default function ModelCatalogTable({
  artifacts,
}: {
  artifacts: ModelArtifact[];
}) {
  const [showCacheRead, setShowCacheRead] = useState(false);

  return (
    <div className="not-prose mt-6">
      <div className="mb-3 flex justify-end">
        <div
          aria-label="Input pricing mode"
          className="inline-flex rounded-lg border p-0.5"
          role="group"
          style={{
            background: "var(--sidebar-bg)",
            borderColor: "var(--sidebar-border)",
          }}
        >
          {[
            { label: "Standard", cacheRead: false },
            { label: "Cache read", cacheRead: true },
          ].map(({ label, cacheRead }) => {
            const selected = showCacheRead === cacheRead;
            return (
              <button
                aria-pressed={selected}
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                key={label}
                onClick={() => setShowCacheRead(cacheRead)}
                style={{
                  background: selected ? "var(--background)" : "transparent",
                  boxShadow: selected ? "0 1px 2px rgb(0 0 0 / 0.12)" : "none",
                  color: selected
                    ? showCacheRead
                      ? "#16a34a"
                      : "var(--foreground)"
                    : "var(--text-muted)",
                }}
                type="button"
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
              <th className="px-3 py-2 font-semibold">Model</th>
              {PRICING_TIERS.map((tier) => (
                <th className="px-3 py-2 font-semibold" key={tier}>
                  {tier}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {artifacts.map((artifact) => (
              <tr
                key={artifact.id}
                style={{ borderBottom: "1px solid var(--sidebar-border)" }}
              >
                <td className="px-3 py-3 font-medium">
                  <Link
                    className="hover:underline"
                    href={getModelArtifactPath(artifact.slug)}
                    style={{ color: "var(--link-color)" }}
                  >
                    {artifact.name}
                  </Link>
                </td>
                {PRICING_TIERS.map((tier) => (
                  <td className="px-3 py-3" key={tier}>
                    <PricingCell
                      row={artifact.pricing.find(
                        (pricing) => pricing.priority === tier,
                      )}
                      showCacheRead={showCacheRead}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
