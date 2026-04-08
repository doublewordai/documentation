import type { DocPageForNav } from "@/sanity/types";
import { getModelArtifacts, getModelArtifactPath } from "@/lib/model-artifacts";

type GroupedDocs = Record<
  string,
  {
    category: DocPageForNav["category"];
    docs: DocPageForNav[];
  }
>;

type SidebarSection = {
  id: string;
  name: string;
  order: number;
  docs: Array<
    | string
    | {
        slug: string;
        title: string;
        href: string;
        externalLinkIcon?: boolean;
        parentSlug?: string | null;
      }
  >;
};

const SECTIONS: SidebarSection[] = [
  {
    id: "docs",
    name: "",
    order: 10,
    docs: [
      "intro-to-doubleword-inference",
      "realtime-inference",
      "async-inference",
      "batch-inference",
      {
        slug: "models",
        title: "Models",
        href: "/inference-api/models",
      },
      {
        slug: "using-the-platform",
        title: "Using the Platform",
        href: "/inference-api/creating-an-api-key",
      },
      "creating-an-api-key",
      "tool-calling",
      "batch-notifications-and-webhooks",
      "jsonl-files",
      {
        slug: "organizations",
        title: "Organizations",
        href: "/inference-api/organizations-overview",
      },
      "organizations-overview",
      "inviting-team-members",
      "organization-api-keys",
      "organization-batches",
      "organization-credits",
      {
        slug: "account-and-billing",
        title: "Account & Billing",
        href: "/inference-api/adding-credits-to-your-account",
      },
      "adding-credits-to-your-account",
      "auto-topup",
      "how-to-manage-payments",
      {
        slug: "libraries",
        title: "SDKs & CLI",
        href: "/inference-api/autobatcher",
      },
      "autobatcher",
      "dw-cli",
      "cli-examples",
      "async-agents",
      "data-processing-pipelines",
      "structured-extraction",
      "semantic-search-without-embeddings",
      "research-summaries",
      "image-summarization",
      "embeddings",
      "model-evals",
      "synthetic-data-generation",
      "dataset-compilation",
      "bug-detection-ensemble",
      "openclaw-setup",
    ],
  },
  {
    id: "bottom-links",
    name: "",
    order: 30,
    docs: [
      "api-reference",
      "skill",
      {
        slug: "dw-cli",
        title: "Doubleword CLI",
        href: "/dw-cli",
        externalLinkIcon: true,
      },
      "get-support",
    ],
  },
];

const SUPERSEDED_SLUGS = new Set([
  "model-pricing",
  "why-batch-inference-matters",
  "parallel-primitives",
  "behind-the-stack-batched-endpoints",
  "zerodp-just-in-time-weight-offloading-over-nvlink-for-data-parallelism",
]);
const START_ROOT_SLUG = "intro-to-doubleword-inference";
const MODELS_ROOT_SLUG = "models";
const PLATFORM_ROOT_SLUG = "using-the-platform";
const ORGANIZATIONS_ROOT_SLUG = "organizations";
const ACCOUNT_BILLING_ROOT_SLUG = "account-and-billing";
const LIBRARIES_ROOT_SLUG = "libraries";
const EXAMPLES_ROOT_SLUG = "cli-examples";

const CHILD_PARENT_BY_SLUG: Record<string, string> = {
  "batch-inference": START_ROOT_SLUG,
  "async-inference": START_ROOT_SLUG,
  "realtime-inference": START_ROOT_SLUG,
  "creating-an-api-key": PLATFORM_ROOT_SLUG,
  "tool-calling": PLATFORM_ROOT_SLUG,
  "batch-notifications-and-webhooks": PLATFORM_ROOT_SLUG,
  "jsonl-files": PLATFORM_ROOT_SLUG,
  "organizations-overview": ORGANIZATIONS_ROOT_SLUG,
  "inviting-team-members": ORGANIZATIONS_ROOT_SLUG,
  "organization-api-keys": ORGANIZATIONS_ROOT_SLUG,
  "organization-batches": ORGANIZATIONS_ROOT_SLUG,
  "organization-credits": ORGANIZATIONS_ROOT_SLUG,
  "adding-credits-to-your-account": ACCOUNT_BILLING_ROOT_SLUG,
  "auto-topup": ACCOUNT_BILLING_ROOT_SLUG,
  "how-to-manage-payments": ACCOUNT_BILLING_ROOT_SLUG,
  autobatcher: LIBRARIES_ROOT_SLUG,
  "dw-cli": LIBRARIES_ROOT_SLUG,
  "async-agents": EXAMPLES_ROOT_SLUG,
  "data-processing-pipelines": EXAMPLES_ROOT_SLUG,
  "structured-extraction": EXAMPLES_ROOT_SLUG,
  "semantic-search-without-embeddings": EXAMPLES_ROOT_SLUG,
  "research-summaries": EXAMPLES_ROOT_SLUG,
  "image-summarization": EXAMPLES_ROOT_SLUG,
  "embeddings": EXAMPLES_ROOT_SLUG,
  "model-evals": EXAMPLES_ROOT_SLUG,
  "synthetic-data-generation": EXAMPLES_ROOT_SLUG,
  "dataset-compilation": EXAMPLES_ROOT_SLUG,
  "bug-detection-ensemble": EXAMPLES_ROOT_SLUG,
};

const ROOT_LABEL_BY_SLUG: Record<string, string> = {
  [START_ROOT_SLUG]: "Overview",
  [EXAMPLES_ROOT_SLUG]: "Workbooks",
  "dw-cli": "dw CLI",
};

function buildCategory(section: SidebarSection): DocPageForNav["category"] {
  return {
    _id: `inference-api:${section.id}`,
    name: section.name,
    slug: { current: section.id },
    order: section.order,
  };
}

export async function organizeInferenceApiSidebar(docs: DocPageForNav[]): Promise<GroupedDocs> {
  const docsBySlug = new Map(docs.map((doc) => [doc.slug.current, doc]));
  const groupedDocs: GroupedDocs = {};
  const usedSlugs = new Set<string>();
  const modelArtifacts = await getModelArtifacts();

  for (const section of SECTIONS) {
    const category = buildCategory(section);
    const sectionDocs: DocPageForNav[] = [];

    section.docs.forEach((entry, index) => {
      if (typeof entry === "string") {
        const doc = docsBySlug.get(entry);
        if (!doc) return;

        usedSlugs.add(entry);
        sectionDocs.push({
          ...doc,
          order: index,
          parentSlug: CHILD_PARENT_BY_SLUG[doc.slug.current] || null,
          sidebarLabel: ROOT_LABEL_BY_SLUG[doc.slug.current] || doc.sidebarLabel,
          categorySlug: category.slug.current,
          categoryName: category.name,
          category,
        });
        return;
      }

      sectionDocs.push({
        _id: `synthetic:${entry.slug}`,
        title: entry.title,
        slug: { current: entry.slug },
        href: entry.href,
        order: index,
        sidebarLabel: entry.title,
        externalLinkIcon: entry.externalLinkIcon,
        categorySlug: category.slug.current,
        categoryName: category.name,
        parentSlug: entry.parentSlug ?? null,
        category,
      });
    });

    if (sectionDocs.length > 0) {
      if (section.id === "docs") {
        sectionDocs.push(
          ...modelArtifacts.map((artifact, index) => ({
            _id: `synthetic:model:${artifact.slug}`,
            title: artifact.name,
            slug: { current: `models/${artifact.slug}` },
            href: getModelArtifactPath(artifact.slug),
            order: 100 + index,
            sidebarLabel: artifact.name,
            categorySlug: category.slug.current,
            categoryName: category.name,
            parentSlug: MODELS_ROOT_SLUG,
            category,
          })),
        );
      }

      if (sectionDocs.length > 0) {
        groupedDocs[category._id] = {
          category,
          docs: sectionDocs,
        };
      }
    }
  }

  const uncategorizedDocs = docs.filter(
    (doc) =>
      !usedSlugs.has(doc.slug.current) &&
      !SUPERSEDED_SLUGS.has(doc.slug.current) &&
      doc.slug.current !== "models",
  );

  if (uncategorizedDocs.length > 0) {
    console.warn(
      "Unmapped inference-api sidebar docs:",
      uncategorizedDocs.map((doc) => doc.slug.current),
    );
  }

  return groupedDocs;
}
