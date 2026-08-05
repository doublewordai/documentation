import { cache } from "react";
import { fetchModelsFromApiRoute, type Model } from "@/lib/models";
import type { DocSearchIndexItem } from "@/sanity/types";

const MODELS_PRODUCT_SLUG = "inference-api";
const MODELS_OVERVIEW_SLUG = "models";

export function getModelsOverviewPath() {
  return `/${MODELS_PRODUCT_SLUG}/${MODELS_OVERVIEW_SLUG}`;
}

export function getModelArtifactPath(slug: string) {
  return `${getModelsOverviewPath()}/${slug}`;
}

export type ModelArtifactPricingRow = {
  priority: string;
  inputTokensPer1M: string;
  cacheReadTokensPer1M?: string;
  outputTokensPer1M: string;
};

export type ModelArtifact = {
  name: string;
  slug: string;
  id: string;
  rawName: string;
  iconUrl?: string;
  providerName?: string;
  type: string;
  description?: string;
  capabilities: string[];
  playgroundUrl: string;
  pricing: ModelArtifactPricingRow[];
};

function slugifyModelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatPricePer1M(pricePerToken: number): string {
  return `\\$${(pricePerToken * 1_000_000).toFixed(2)}`;
}

function renderProvider(providerName?: string): string {
  if (!providerName) return "—";
  return providerName || "—";
}

function getActiveCacheReadMultiplier(model: Model): number | undefined {
  const cachePricing = model.cachePricing;
  if (!cachePricing?.enabled || cachePricing.readMultiplier === null) {
    return undefined;
  }

  const now = Date.now();
  const validFrom = cachePricing.validFrom ? Date.parse(cachePricing.validFrom) : null;
  const validUntil = cachePricing.validUntil ? Date.parse(cachePricing.validUntil) : null;
  if (validFrom !== null && (!Number.isFinite(validFrom) || validFrom > now)) {
    return undefined;
  }
  if (validUntil !== null && (!Number.isFinite(validUntil) || validUntil <= now)) {
    return undefined;
  }
  return cachePricing.readMultiplier;
}

function buildPricing(model: Model): ModelArtifactPricingRow[] {
  const rows: ModelArtifactPricingRow[] = [];
  const cacheReadMultiplier = getActiveCacheReadMultiplier(model);
  const buildRow = (
    priority: string,
    pricing: NonNullable<Model["pricing"]["realtime"]>,
  ): ModelArtifactPricingRow => ({
    priority,
    inputTokensPer1M: formatPricePer1M(pricing.input),
    ...(cacheReadMultiplier !== undefined
      ? { cacheReadTokensPer1M: formatPricePer1M(pricing.input * cacheReadMultiplier) }
      : {}),
    outputTokensPer1M: formatPricePer1M(pricing.output),
  });

  if (model.pricing.realtime) {
    rows.push(buildRow("Realtime", model.pricing.realtime));
  }

  if (model.pricing.async) {
    rows.push(buildRow("Async", model.pricing.async));
  }

  if (model.pricing.batch24h) {
    rows.push(buildRow("Batch (24h)", model.pricing.batch24h));
  }

  return rows;
}

export function buildModelArtifacts(models: Model[]): ModelArtifact[] {
  return models.map(toModelArtifact);
}

function toModelArtifact(model: Model): ModelArtifact {
  return {
    id: model.id,
    name: model.displayName,
    rawName: model.name,
    slug: slugifyModelName(model.name),
    iconUrl: model.iconUrl,
    providerName: model.providerName,
    type: model.type,
    description: model.description,
    capabilities: model.capabilities,
    playgroundUrl: `https://app.doubleword.ai/playground?model=${encodeURIComponent(model.id)}&from=%2Fmodels`,
    pricing: buildPricing(model),
  };
}

export const getModelArtifacts = cache(async (): Promise<ModelArtifact[]> => {
  const { models } = await fetchModelsFromApiRoute();

  return buildModelArtifacts(models);
});

export async function getModelArtifact(slug: string): Promise<ModelArtifact | null> {
  const artifacts = await getModelArtifacts();
  return artifacts.find((artifact) => artifact.slug === slug) || null;
}

export async function getModelsIndexMarkdown(): Promise<string> {
  const artifacts = await getModelArtifacts();

  return renderModelsIndexMarkdown(artifacts);
}

export function renderModelsIndexMarkdown(artifacts: ModelArtifact[]): string {

  const formatTierCell = (artifact: ModelArtifact, priority: string): string => {
    const row = artifact.pricing.find((p) => p.priority === priority);
    if (!row) return "—";
    return `${row.inputTokensPer1M} / ${row.cacheReadTokensPer1M || "—"} / ${row.outputTokensPer1M}`;
  };

  const overviewTable = [
    "| Model | Provider | Type | Realtime | Async | Batch (24h) |",
    "|-------|----------|------|----------|-------|-------------|",
    ...artifacts.map((artifact) => {
      return `| [${artifact.name}](${getModelArtifactPath(artifact.slug)}) | ${renderProvider(artifact.providerName)} | ${artifact.type} | ${formatTierCell(artifact, "Realtime")} | ${formatTierCell(artifact, "Async")} | ${formatTierCell(artifact, "Batch (24h)")} |`;
    }),
  ].join("\n");

  return `Doubleword Batch API is priced per model based on token usage. Costs are calculated separately for input tokens (the content you send) and output tokens (the content generated by the model).

The table below outlines the models we have available and their pricing per 1M tokens. Prices are shown as input / cache read / output. If you are interested in understanding pricing for a model not listed below or if you'd like to request a new model - please reach out to support@doubleword.ai.

## Model Catalog

${overviewTable}
`;
}

export function renderModelArtifactMarkdown(artifact: ModelArtifact): string {
  const capabilities = artifact.capabilities || [];
  const metadata = [
    `- **Type:** ${artifact.type}`,
    capabilities.length > 0
      ? `- **Capabilities:** ${capabilities.map((capability) => `\`${capability}\``).join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const pricingTable =
    artifact.pricing.length > 0
      ? [
          "## Pricing",
          "",
          "| Priority | Input Tokens (per 1M) | Cache Read Tokens (per 1M) | Output Tokens (per 1M) |",
          "|----------|------------------------|----------------------------|------------------------|",
          ...artifact.pricing.map(
            (row) => {
              const priority =
                row.priority === "Realtime"
                  ? 'Realtime[^realtime-availability]'
                  : row.priority;

              return `| ${priority} | ${row.inputTokensPer1M} | ${row.cacheReadTokensPer1M || "—"} | ${row.outputTokensPer1M} |`;
            },
          ),
          "",
          artifact.pricing.some((row) => row.priority === "Realtime")
            ? "[^realtime-availability]: Realtime availability is limited. Doubleword is primarily a batch API."
            : "",
          artifact.pricing.some((row) => row.priority === "Realtime") ? "" : "",
        ].join("\n")
      : "## Pricing\n\nPricing is not currently available for this model.\n";

  const description = artifact.description
    ? `## Overview\n\n${artifact.description}\n\n`
    : "";

  const icon = artifact.iconUrl
    ? `![${artifact.name} icon](${artifact.iconUrl})\n\n`
    : "";

  return `# ${artifact.name}

${icon}${metadata}

${description}${pricingTable}## Playground

Open this model in the [Playground](${artifact.playgroundUrl}).
`;
}

export async function getModelArtifactSearchItems(): Promise<DocSearchIndexItem[]> {
  const artifacts = await getModelArtifacts();

  return artifacts.map((artifact) => ({
    _id: `model:${artifact.slug}`,
    title: artifact.name,
    description: artifact.pricing
      .map((row) => `${row.priority}: ${row.inputTokensPer1M} input / ${row.outputTokensPer1M} output`)
      .join("; "),
    body: renderModelArtifactMarkdown(artifact),
    slug: `${MODELS_OVERVIEW_SLUG}/${artifact.slug}`,
    productSlug: MODELS_PRODUCT_SLUG,
    productName: "Doubleword Inference API",
    categorySlug: "models",
    categoryName: "Models",
    sourceType: "external",
  }));
}
