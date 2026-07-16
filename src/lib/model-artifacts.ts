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
  reasoningEfforts?: {
    chatCompletions: string[];
    responses: string[];
  };
  playgroundUrl: string;
  pricing: ModelArtifactPricingRow[];
};

function slugifyModelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

function formatReasoningEfforts(efforts: string[]): string {
  if (efforts.length === 0) return "—";
  return efforts.map((effort) => `\`${escapeMarkdownTableCell(effort)}\``).join(", ");
}

function supportsReasoning(model: Model): boolean {
  return model.capabilities.includes("reasoning");
}

export function renderReasoningCapabilitiesMatrix(
  models: Model[],
): string {
  const rows = models.flatMap((model) => {
    const efforts = model.supportedReasoningEfforts;
    if (!supportsReasoning(model) || !efforts) return [];

    const displayName = escapeMarkdownTableCell(model.displayName);
    const modelCell = `[${displayName}](${getModelArtifactPath(slugifyModelName(model.name))})`;

    return [`| ${modelCell} | ${formatReasoningEfforts(efforts.chatCompletions)} | ${formatReasoningEfforts(efforts.responses)} |`];
  });
  if (rows.length === 0) {
    return "Reasoning capability data is not currently available.";
  }

  return [
    "| Model | Chat Completions | Responses |",
    "|-------|------------------|-----------|",
    ...rows,
    "",
    "Models not listed do not currently advertise reasoning effort controls.",
  ].join("\n");
}

function formatPricePer1M(pricePerToken: number): string {
  return `\\$${(pricePerToken * 1_000_000).toFixed(2)}`;
}

function renderProvider(providerName?: string): string {
  if (!providerName) return "—";
  return providerName || "—";
}

function buildPricing(model: Model): ModelArtifactPricingRow[] {
  const rows: ModelArtifactPricingRow[] = [];

  if (model.pricing.realtime) {
    rows.push({
      priority: "Realtime",
      inputTokensPer1M: formatPricePer1M(model.pricing.realtime.input),
      outputTokensPer1M: formatPricePer1M(model.pricing.realtime.output),
    });
  }

  if (model.pricing.async) {
    rows.push({
      priority: "Async",
      inputTokensPer1M: formatPricePer1M(model.pricing.async.input),
      outputTokensPer1M: formatPricePer1M(model.pricing.async.output),
    });
  }

  if (model.pricing.batch24h) {
    rows.push({
      priority: "Batch (24h)",
      inputTokensPer1M: formatPricePer1M(model.pricing.batch24h.input),
      outputTokensPer1M: formatPricePer1M(model.pricing.batch24h.output),
    });
  }

  return rows;
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
    reasoningEfforts: supportsReasoning(model)
      ? model.supportedReasoningEfforts
      : undefined,
    playgroundUrl: `https://app.doubleword.ai/playground?model=${encodeURIComponent(model.id)}&from=%2Fmodels`,
    pricing: buildPricing(model),
  };
}

export function buildModelArtifacts(models: Model[]): ModelArtifact[] {
  return models.map(toModelArtifact);
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

  const formatTierCell = (artifact: ModelArtifact, priority: string): string => {
    const row = artifact.pricing.find((p) => p.priority === priority);
    if (!row) return "—";
    return `${row.inputTokensPer1M} in / ${row.outputTokensPer1M} out`;
  };

  const overviewTable = [
    "| Model | Provider | Type | Realtime | Async | Batch (24h) |",
    "|-------|----------|------|----------|-------|-------------|",
    ...artifacts.map((artifact) => {
      return `| [${artifact.name}](${getModelArtifactPath(artifact.slug)}) | ${renderProvider(artifact.providerName)} | ${artifact.type} | ${formatTierCell(artifact, "Realtime")} | ${formatTierCell(artifact, "Async")} | ${formatTierCell(artifact, "Batch (24h)")} |`;
    }),
  ].join("\n");

  return `Doubleword Batch API is priced per model based on token usage. Costs are calculated separately for input tokens (the content you send) and output tokens (the content generated by the model).

The table below outlines the models we have available and their pricing per 1M tokens. If you are interested in understanding pricing for a model not listed below or if you'd like to request a new model - please reach out to support@doubleword.ai.

:::info{title="Info - Prompt Caching"}
Prompt caching can cut input costs dramatically: cached input tokens are billed at ~10% of the standard input rate (a 90% discount), with a small one-time write premium (1.25× for the 5-minute cache, 2× for 1-hour). See the [Prompt caching guide](/inference-api/prompt-caching) to enable it.
:::

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
          "| Priority | Input Tokens (per 1M) | Output Tokens (per 1M) |",
          "|----------|------------------------|------------------------|",
          ...artifact.pricing.map(
            (row) => {
              const priority =
                row.priority === "Realtime"
                  ? 'Realtime[^realtime-availability]'
                  : row.priority;

              return `| ${priority} | ${row.inputTokensPer1M} | ${row.outputTokensPer1M} |`;
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

  const reasoningEfforts = artifact.reasoningEfforts;
  const reasoningRows = reasoningEfforts
    ? [
        reasoningEfforts.chatCompletions.length > 0
          ? `- **Chat Completions:** ${reasoningEfforts.chatCompletions.map((effort) => `\`${effort}\``).join(", ")}`
          : "",
        reasoningEfforts.responses.length > 0
          ? `- **Responses:** ${reasoningEfforts.responses.map((effort) => `\`${effort}\``).join(", ")}`
          : "",
      ].filter(Boolean)
    : [];
  const reasoning = reasoningRows.length > 0
    ? `## Reasoning efforts\n\n${reasoningRows.join("\n")}\n\nSee the [reasoning effort guide](/inference-api/reasoning-controls) for request examples.\n\n`
    : "";

  const icon = artifact.iconUrl
    ? `![${artifact.name} icon](${artifact.iconUrl})\n\n`
    : "";

  return `# ${artifact.name}

${icon}${metadata}

${description}${reasoning}${pricingTable}## Playground

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
