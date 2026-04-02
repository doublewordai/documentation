import type { DocPageForNav } from "@/sanity/types";

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
      }
  >;
};

const SECTIONS: SidebarSection[] = [
  {
    id: "start",
    name: "Start",
    order: 10,
    docs: [
      "intro-to-doubleword-inference",
      "creating-an-api-key",
      "batch-inference",
      "async-inference",
      "realtime-inference",
    ],
  },
  {
    id: "how-to",
    name: "How-To",
    order: 20,
    docs: [
      "tool-calling",
      "batch-notifications-and-webhooks",
      "organizations-overview",
      "inviting-team-members",
      "organization-api-keys",
      "organization-credits",
      "auto-topup",
      "how-to-manage-payments",
      "organization-batches",
    ],
  },
  {
    id: "models",
    name: "Models",
    order: 30,
    docs: [
      {
        slug: "models",
        title: "Models & Pricing",
        href: "/models",
      },
    ],
  },
  {
    id: "examples",
    name: "Examples",
    order: 40,
    docs: [
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
      "cli-examples",
      "openclaw-setup",
    ],
  },
  {
    id: "concepts",
    name: "Concepts",
    order: 50,
    docs: [
      "why-batch-inference-matters",
      "parallel-primitives",
      "behind-the-stack-batched-endpoints",
      "zerodp-just-in-time-weight-offloading-over-nvlink-for-data-parallelism",
      "jsonl-files",
    ],
  },
  {
    id: "reference",
    name: "Reference",
    order: 60,
    docs: [
      "api-reference",
      "skill",
      "autobatcher",
      {
        slug: "dw-cli",
        title: "Doubleword CLI",
        href: "/dw-cli",
      },
    ],
  },
  {
    id: "support",
    name: "Support",
    order: 70,
    docs: ["get-support"],
  },
];

function buildCategory(section: SidebarSection): DocPageForNav["category"] {
  return {
    _id: `inference-api:${section.id}`,
    name: section.name,
    slug: { current: section.id },
    order: section.order,
  };
}

export function organizeInferenceApiSidebar(docs: DocPageForNav[]): GroupedDocs {
  const docsBySlug = new Map(docs.map((doc) => [doc.slug.current, doc]));
  const groupedDocs: GroupedDocs = {};
  const usedSlugs = new Set<string>();

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
          parentSlug: null,
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
        parentSlug: null,
        category,
      });
    });

    if (sectionDocs.length > 0) {
      groupedDocs[category._id] = {
        category,
        docs: sectionDocs,
      };
    }
  }

  const uncategorizedDocs = docs
    .filter((doc) => !usedSlugs.has(doc.slug.current))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  if (uncategorizedDocs.length > 0) {
    const category = buildCategory({
      id: "more",
      name: "More",
      order: 80,
      docs: [],
    });
    groupedDocs[category._id] = {
      category,
      docs: uncategorizedDocs.map((doc, index) => ({
        ...doc,
        order: index,
        parentSlug: null,
        categorySlug: category.slug.current,
        categoryName: category.name,
        category,
      })),
    };
  }

  return groupedDocs;
}
