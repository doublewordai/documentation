"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import {
  getModelArtifactPath,
  type ModelArtifact,
  type ModelArtifactPricingRow,
} from "@/lib/model-artifacts";
import {
  SCHEDULED_FOR_DEPRECATION_ANCHOR,
  type ModelDeprecation,
  type ModelReference,
} from "@/lib/model-deprecations";

const PRICING_TIERS = ["Realtime", "Async", "Batch (24h)"] as const;

const CATALOG_TABS = [
  { id: "active-models", label: "Active Models" },
  { id: SCHEDULED_FOR_DEPRECATION_ANCHOR, label: "Scheduled for Shutdown" },
] as const;

type CatalogTab = (typeof CATALOG_TABS)[number]["id"];

const rowBorder = { borderBottom: "1px solid var(--sidebar-border)" };

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

function PricingTable({ artifacts }: { artifacts: ModelArtifact[] }) {
  return (
    <div className="not-prose">
      <p className="mb-3 text-right text-xs" style={{ color: "var(--text-muted)" }}>
        Input / cache read / output per 1M tokens
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr style={rowBorder}>
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
              <tr key={artifact.id} style={rowBorder}>
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

function ReplacementLink({
  model,
  liveArtifacts,
}: {
  model: ModelReference;
  liveArtifacts: Map<string, ModelArtifact>;
}) {
  const artifact = liveArtifacts.get(model.id);
  if (!artifact) return <>{model.name}</>;

  return (
    <Link
      className="hover:underline"
      href={getModelArtifactPath(artifact.slug)}
      style={{ color: "var(--link-color)" }}
    >
      {model.name}
    </Link>
  );
}

function DeprecationTable({
  deprecations,
  liveArtifacts,
}: {
  deprecations: ModelDeprecation[];
  liveArtifacts: Map<string, ModelArtifact>;
}) {
  return (
    <div className="not-prose overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr style={rowBorder}>
            <th className="px-3 py-2 font-semibold">Model</th>
            <th className="px-3 py-2 font-semibold">Recommended Replacement</th>
          </tr>
        </thead>
        <tbody>
          {deprecations.map((deprecation) => (
            <tr key={deprecation.id} style={rowBorder}>
              <td className="px-3 py-3 font-medium">{deprecation.name}</td>
              <td className="px-3 py-3">
                {deprecation.replacement.map((segment, index) => (
                  <Fragment key={index}>
                    {typeof segment === "string"
                      ? segment
                      : <ReplacementLink model={segment} liveArtifacts={liveArtifacts} />}
                  </Fragment>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function useCatalogTab() {
  const [tab, setTab] = useState<CatalogTab>("active-models");

  useEffect(() => {
    const openScheduledFromHash = () => {
      if (window.location.hash === `#${SCHEDULED_FOR_DEPRECATION_ANCHOR}`) {
        setTab(SCHEDULED_FOR_DEPRECATION_ANCHOR);
      }
    };

    openScheduledFromHash();
    window.addEventListener("hashchange", openScheduledFromHash);
    return () => window.removeEventListener("hashchange", openScheduledFromHash);
  }, []);

  const selectTab = (next: CatalogTab) => {
    setTab(next);
    const hash = next === SCHEDULED_FOR_DEPRECATION_ANCHOR ? `#${next}` : "";
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
  };

  return [tab, selectTab] as const;
}

export default function ModelCatalogTable({
  artifacts,
  deprecations,
}: {
  artifacts: ModelArtifact[];
  deprecations: ModelDeprecation[];
}) {
  const [tab, selectTab] = useCatalogTab();

  if (deprecations.length === 0) {
    return (
      <div className="mt-6">
        <PricingTable artifacts={artifacts} />
      </div>
    );
  }

  const deprecatedIds = new Set(deprecations.map((deprecation) => deprecation.id));
  const liveArtifacts = new Map(artifacts.map((artifact) => [artifact.id, artifact]));

  return (
    <div className="mt-6">
      <div
        role="tablist"
        aria-label="Model availability"
        className="not-prose flex gap-1 overflow-x-auto"
        style={rowBorder}
      >
        {CATALOG_TABS.map(({ id, label }) => (
          <button
            key={id}
            id={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`${id}-panel`}
            onClick={() => selectTab(id)}
            className="scroll-mt-[7.5rem] lg:scroll-mt-16 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors"
            style={{
              color: tab === id ? "var(--foreground)" : "var(--text-muted)",
              borderBottom: tab === id
                ? "2px solid var(--link-color)"
                : "2px solid transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id="active-models-panel"
        aria-labelledby="active-models"
        hidden={tab !== "active-models"}
        className="pt-4"
      >
        <PricingTable
          artifacts={artifacts.filter((artifact) => !deprecatedIds.has(artifact.id))}
        />
      </div>

      <div
        role="tabpanel"
        id={`${SCHEDULED_FOR_DEPRECATION_ANCHOR}-panel`}
        aria-labelledby={SCHEDULED_FOR_DEPRECATION_ANCHOR}
        hidden={tab !== SCHEDULED_FOR_DEPRECATION_ANCHOR}
        className="pt-4"
      >
        <DeprecationTable deprecations={deprecations} liveArtifacts={liveArtifacts} />
      </div>
    </div>
  );
}
