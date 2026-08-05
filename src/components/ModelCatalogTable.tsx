"use client";

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

function PricingCell({ row }: { row?: ModelArtifactPricingRow }) {
  if (!row) return <span aria-label="Unavailable">—</span>;

  return (
    <span className="whitespace-nowrap tabular-nums">
      {displayPrice(row.inputTokensPer1M)} / {row.cacheReadPricePer1M
        ? displayPrice(row.cacheReadPricePer1M)
        : displayPrice(row.inputTokensPer1M)} / {displayPrice(row.outputTokensPer1M)}
    </span>
  );
}

export default function ModelCatalogTable({
  artifacts,
}: {
  artifacts: ModelArtifact[];
}) {
  return (
    <div className="not-prose mt-6">
      <p className="mb-3 text-right text-xs" style={{ color: "var(--text-muted)" }}>
        Input / cache read / output per 1M tokens
      </p>

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
                    <PricingCell row={artifact.pricing.find(
                      (pricing) => pricing.priority === tier,
                    )} />
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
