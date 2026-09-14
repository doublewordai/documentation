import type { DocPageForNav } from "@/sanity/types";
import { getModelArtifacts, getModelArtifactPath } from "@/lib/model-artifacts";
import {
  REGIONAL_ENDPOINTS_SLUG,
  REGIONAL_ENDPOINTS_TITLE,
} from "@/lib/regional-endpoints";

type GroupedDocs = Record<
  string,
  {
    category: DocPageForNav["category"];
    docs: DocPageForNav[];
  }
>;

const FOOTER_SLUGS = new Set(["api-reference", "skill", "get-support"]);
const IGNORED_CATEGORY_SLUGS = new Set(["archive"]);
const MODELS_ROOT_SLUG = "models";
const REGIONAL_ENDPOINTS_ANCHOR_SLUG = "creating-an-api-key";

function buildBottomCategory(): DocPageForNav["category"] {
  return {
    _id: "inference-api:bottom-links",
    name: "",
    slug: { current: "bottom-links" },
    order: 999,
  };
}

function groupDocsByCategory(docs: DocPageForNav[]): GroupedDocs {
  return docs.reduce((acc, doc) => {
    if (!doc.category) return acc;

    const categoryId = doc.category._id;
    if (!acc[categoryId]) {
      acc[categoryId] = {
        category: doc.category,
        docs: [],
      };
    }

    acc[categoryId].docs.push(doc);
    return acc;
  }, {} as GroupedDocs);
}

export async function organizeInferenceApiSidebar(docs: DocPageForNav[]): Promise<GroupedDocs> {
  const mainDocs = docs.filter(
    (doc) =>
      !FOOTER_SLUGS.has(doc.slug.current) &&
      !IGNORED_CATEGORY_SLUGS.has(doc.category?.slug.current || ""),
  );
  const groupedDocs = groupDocsByCategory(mainDocs);

  const modelsRootDoc = mainDocs.find((doc) => doc.slug.current === MODELS_ROOT_SLUG);
  const modelArtifacts = await getModelArtifacts();

  if (modelsRootDoc?.category) {
    const categoryId = modelsRootDoc.category._id;
    const categoryGroup = groupedDocs[categoryId];

    if (categoryGroup) {
      const existingModelSlugs = new Set(categoryGroup.docs.map((doc) => doc.slug.current));
      const modelDocs: DocPageForNav[] = modelArtifacts
        .map((artifact, index) => ({
          _id: `synthetic:model:${artifact.slug}`,
          title: artifact.name,
          sidebarLabel: artifact.name,
          slug: { current: `models/${artifact.slug}` },
          href: getModelArtifactPath(artifact.slug),
          order: (modelsRootDoc.order ?? 0) + 1 + index,
          categorySlug: categoryGroup.category.slug.current,
          categoryName: categoryGroup.category.name,
          category: categoryGroup.category,
          parentSlug: MODELS_ROOT_SLUG,
        }))
        .filter((doc) => !existingModelSlugs.has(doc.slug.current));

      categoryGroup.docs = [...categoryGroup.docs, ...modelDocs].sort(
        (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
      );
    }
  }

  // Regional endpoints is a synthesized in-repo page (see regional-endpoints.ts),
  // anchored beside "Creating an API Key" so it sits with the key-management
  // docs. A Sanity page with the same slug takes over if one is ever created.
  const regionalAnchorDoc = mainDocs.find((doc) => doc.slug.current === REGIONAL_ENDPOINTS_ANCHOR_SLUG);
  const sanityHasRegionalPage = mainDocs.some((doc) => doc.slug.current === REGIONAL_ENDPOINTS_SLUG);
  if (regionalAnchorDoc?.category && !sanityHasRegionalPage) {
    const categoryGroup = groupedDocs[regionalAnchorDoc.category._id];
    if (categoryGroup) {
      const regionalDoc: DocPageForNav = {
        _id: `synthetic:${REGIONAL_ENDPOINTS_SLUG}`,
        title: REGIONAL_ENDPOINTS_TITLE,
        sidebarLabel: REGIONAL_ENDPOINTS_TITLE,
        slug: { current: REGIONAL_ENDPOINTS_SLUG },
        order: (regionalAnchorDoc.order ?? 0) + 0.5,
        categorySlug: categoryGroup.category.slug.current,
        categoryName: categoryGroup.category.name,
        category: categoryGroup.category,
        parentSlug: regionalAnchorDoc.parentSlug ?? null,
      };
      categoryGroup.docs = [...categoryGroup.docs, regionalDoc].sort(
        (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
      );
    }
  }

  const footerCategory = buildBottomCategory();
  const footerDocs: DocPageForNav[] = docs
    .filter((doc) => FOOTER_SLUGS.has(doc.slug.current))
    .map((doc) => ({
      ...doc,
      categorySlug: footerCategory.slug.current,
      categoryName: footerCategory.name,
      category: footerCategory,
    }))
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));

  groupedDocs[footerCategory._id] = {
    category: footerCategory,
    docs: footerDocs,
  };

  return groupedDocs;
}
