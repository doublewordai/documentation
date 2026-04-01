import { defineQuery } from "next-sanity";
import { sanityFetch } from "@/sanity/lib/client";
import { fetchModelsServer } from "@/lib/models";
import { buildTemplateContext, templateMarkdown } from "@/lib/handlebars";
import type { DocSearchIndexItem } from "@/sanity/types";

const MODEL_PRICING_SOURCE_QUERY = defineQuery(`*[
  _type == "docPage" &&
  product->slug.current == "inference-api" &&
  slug.current == "model-pricing"
][0]{
  body,
  title,
  description
}`);

const MODEL_LINK_PATTERN = /\[([^\]]+)\]\(#model-(\d+)\)/g;
const MODEL_TABLE_ROW_PATTERN =
  /^\| \[([^\]]+)\]\(#model-(\d+)\) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|$/gm;
const MODEL_DETAILS_PATTERN =
  /<details id="model-(\d+)">\s*<summary><h3>(.*?)<\/h3>([\s\S]*?)<\/summary>\s*([\s\S]*?)<\/details>/g;

export type ModelArtifactPricingRow = {
  priority: string;
  inputTokensPer1M: string;
  outputTokensPer1M: string;
};

export type ModelArtifact = {
  index: number;
  name: string;
  slug: string;
  playgroundUrl?: string;
  body: string;
  pricing: ModelArtifactPricingRow[];
};

type ModelPricingSource = {
  body?: string;
  title?: string;
  description?: string;
} | null;

function slugifyModelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getResolvedModelPricingMarkdown(): Promise<string> {
  const doc = (await sanityFetch({
    query: MODEL_PRICING_SOURCE_QUERY,
    tags: ["docPage", "models"],
  })) as ModelPricingSource;

  const body = doc?.body || "";
  const modelsResponse = await fetchModelsServer();
  const templateContext = buildTemplateContext(modelsResponse);
  return templateMarkdown(body, templateContext);
}

export async function getModelArtifacts(): Promise<ModelArtifact[]> {
  const markdown = await getResolvedModelPricingMarkdown();
  const pricingByIndex = new Map<number, ModelArtifactPricingRow[]>();

  for (const match of markdown.matchAll(MODEL_TABLE_ROW_PATTERN)) {
    const index = Number(match[2]);
    const rows = pricingByIndex.get(index) || [];
    rows.push({
      priority: match[3].trim(),
      inputTokensPer1M: match[4].trim(),
      outputTokensPer1M: match[5].trim(),
    });
    pricingByIndex.set(index, rows);
  }

  const artifacts: ModelArtifact[] = [];

  for (const match of markdown.matchAll(MODEL_DETAILS_PATTERN)) {
    const index = Number(match[1]);
    const name = match[2].trim();
    const summaryMeta = match[3];
    const body = match[4].trim();
    const playgroundUrl =
      summaryMeta.match(/href="([^"]+)"/)?.[1]?.trim() || undefined;

    artifacts.push({
      index,
      name,
      slug: slugifyModelName(name),
      playgroundUrl,
      body,
      pricing: pricingByIndex.get(index) || [],
    });
  }

  return artifacts.sort((a, b) => a.index - b.index);
}

export async function getModelArtifact(slug: string): Promise<ModelArtifact | null> {
  const artifacts = await getModelArtifacts();
  return artifacts.find((artifact) => artifact.slug === slug) || null;
}

export async function getModelsIndexMarkdown(): Promise<string> {
  const markdown = await getResolvedModelPricingMarkdown();
  const artifacts = await getModelArtifacts();
  const artifactByIndex = new Map(artifacts.map((artifact) => [artifact.index, artifact]));

  const linkedMarkdown = markdown.replace(
    MODEL_LINK_PATTERN,
    (_match, label, indexString) => {
      const artifact = artifactByIndex.get(Number(indexString));
      return artifact ? `[${label}](/models/${artifact.slug})` : `[${label}](#model-${indexString})`;
    },
  );

  const modelLinks = artifacts
    .map((artifact) => `- [${artifact.name}](/models/${artifact.slug})`)
    .join("\n");

  return linkedMarkdown.replace(
    /\n## Model Details[\s\S]*$/m,
    `\n## Model Details\n\nExplore individual model pages:\n\n${modelLinks}\n`,
  );
}

export function renderModelArtifactMarkdown(artifact: ModelArtifact): string {
  const pricingTable =
    artifact.pricing.length > 0
      ? [
          "## Pricing",
          "",
          "| Priority | Input Tokens (per 1M) | Output Tokens (per 1M) |",
          "|----------|------------------------|------------------------|",
          ...artifact.pricing.map(
            (row) =>
              `| ${row.priority} | ${row.inputTokensPer1M} | ${row.outputTokensPer1M} |`,
          ),
          "",
        ].join("\n")
      : "";

  const playground = artifact.playgroundUrl
    ? `Open in the [Playground](${artifact.playgroundUrl}).\n\n`
    : "";

  return `# ${artifact.name}

[Back to model pricing](/models)

${playground}${pricingTable}${artifact.body}
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
    slug: artifact.slug,
    productSlug: "models",
    productName: "Models",
    categorySlug: "model-details",
    categoryName: "Model Details",
    sourceType: "external",
  }));
}
