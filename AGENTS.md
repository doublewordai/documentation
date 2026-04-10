# AGENTS.md — Updating Doubleword Docs

Guide for AI coding agents and developers making changes to the Doubleword documentation. This is the _mechanics_ of editing; for writing style, see the team's content guidelines.

## Mental model

Docs content lives in **three places**. Know which one before making changes:

| Source | What lives there | How to edit |
|---|---|---|
| **Sanity CMS** (`doubleword.sanity.studio`) | Most pages under `/inference-api`, `/control-layer`, `/inference-stack` | Sanity Studio UI (content authors) |
| The [dw CLI repo](https://github.com/doublewordai/dw) (`docs/src/*.md`) | All `/dw-cli/*` pages, pulled at build time | Edit the dw CLI repo, not this one |
| **Auto-generated** from Doubleword API | `/inference-api/models/*` (one page per live model) | Do not edit. Pages appear/disappear as models are added/removed from the API |

This repo (`doublewordai/documentation`) is the **Next.js frontend** that renders all three. Most doc updates are purely content and happen in Sanity Studio, not here.

## When to touch this repo vs. Sanity vs. the dw CLI repo

Use this decision tree:

- **Editing page copy, adding a new workbook, updating a category** → Sanity Studio. No code change.
- **Editing a `/dw-cli/*` page** → [dw CLI repo](https://github.com/doublewordai/dw), file `docs/src/<page>.md`. Update `docs/src/SUMMARY.md` if adding a new page.
- **Updating a model's pricing or description** → Nothing. Model pages are auto-generated from the Doubleword API on every request (ISR, 5-min cache). Fix it in the API if wrong.
- **Changing a page URL (slug or location)** → Change it in Sanity **and** add a redirect in `next.config.ts` (see "Renaming or moving pages" below).
- **Archiving a page** → See "Archiving pages" below.
- **Adding a new product/section** → This repo (new route handler, Sanity product doc).
- **Adding a new markdown feature** (admonition, tabbed code block, handlebars helper) → This repo (`src/app/lib/remark-*.ts` or `src/lib/handlebars.ts`).

## Common tasks

### Add a new doc page

1. Sanity Studio → create `docPage` with `title`, `slug`, `product`, `category`, `order`, `body`.
2. Set `sidebarLabel` if the title is too long for the sidebar.
3. Publish. The webhook at `/api/revalidate` purges the cache; the page appears within ~30s.
4. **No redeploy needed** — content updates are revalidated live.

### Edit an existing page

1. Sanity Studio → edit the `docPage`, publish.
2. If the page has `{{#each models}}` / `{{apiKey}}` / `{{selectedModel.*}}` placeholders, test locally with `npm run dev` before publishing — handlebars errors surface in the dev console.

### Rename or move a page (slug change)

1. Update the slug in Sanity Studio and publish.
2. Add a redirect in `next.config.ts` under the `redirects()` function:
   ```ts
   {
     source: '/inference-api/old-slug',
     destination: '/inference-api/new-slug',
     permanent: true,
   }
   ```
3. **Never skip the redirect.** External sites, the `batch-skill` repo, blog posts, and search engines all link to the old URL. Existing examples in `next.config.ts` show the pattern (e.g., `getting-started-with-batched-api` → `batch-inference`).
4. Check for outbound references (see "Downstream updates" below).

### Archive a page (remove from sidebar without breaking links)

The sidebar code in `src/lib/inference-api-sidebar.ts` **explicitly ignores** the category slug `archive`. That is the archive mechanism.

1. Sanity Studio → set the page's `category` to `archive` (create the category first if it doesn't exist). Publish.
2. The page vanishes from the sidebar but its URL still resolves and still serves markdown at `/<product>/<slug>.md`.
3. If there is a successor page, add a redirect in `next.config.ts` pointing old → new and let the archive category catch stale direct links. If the page is truly gone, just leave it archived — deleting breaks inbound links.
4. Do **not** delete archived pages from Sanity unless you're certain nothing links to them.

Example: `/inference-api/model-pricing` was archived this way when model pages moved to `/inference-api/models` (auto-generated). The page still returns markdown but is no longer in the sidebar.

### Add or update a model

Nothing to do. Model pages at `/inference-api/models/<slug>` are synthesized by `src/lib/model-artifacts.ts` from the live Doubleword API response. Pricing, capabilities, description, playground link — all driven by the API.

To actually add a model, publish it in the Doubleword platform; it shows up within the ISR window (5 min).

### Update `dw-cli` docs

1. Edit `docs/src/<page>.md` in the [dw CLI repo](https://github.com/doublewordai/dw).
2. If adding a new page, also update `docs/src/SUMMARY.md` — that file is the sidebar source of truth for CLI docs. The structure of `SUMMARY.md` maps directly to the sidebar.
3. Merge to `main`. The docs site fetches from the raw GitHub URL with a 1-hour cache (see `src/lib/external-docs.ts`).
4. To cut the wait, trigger a redeploy of the docs site.

### Add a new external doc source

Edit `EXTERNAL_DOCS_SOURCES` in `src/lib/external-docs.ts`. Each source needs: `id`, `title`, `productSlug`, `summaryUrl` (raw `SUMMARY.md` URL), `rawBaseUrl`, `repoUrl`. The Sanity `product` doc with the matching slug must also exist.

### Custom markdown features

| Feature | Syntax | Implementation |
|---|---|---|
| Admonitions | `:::note`, `:::warning`, `:::tip`, `:::danger`, `:::info`, `:::caution` | `src/app/lib/remark-admonitions.ts` |
| Tabbed code blocks | ` ```python tabs=example name=Python sync=lang ` | `src/app/lib/remark-code-tabs.ts` |
| Math | `$inline$`, `$$display$$` (escape currency with `\$`) | `remark-math` + `rehype-katex` |
| Footnotes | `text[^1]` + `[^1]: content` | `remark-gfm` |
| Collapsible sections | `<details><summary>` | HTML passthrough via `rehype-raw` |
| Server-side templating | `{{#each models}}`, `{{formatPricePer1M …}}` | `src/lib/handlebars.ts` |
| Client-side placeholders | `{{apiKey}}`, `{{selectedModel.id}}` | `src/components/ContentInjector.tsx` |

**Handlebars helpers** registered in `src/lib/handlebars.ts`: `formatPrice`, `formatPricePer1M`, `urlEncode`, `eq`, `json`, `hasCapability`. Add new helpers there.

**Client placeholders** are preserved during server templating by the `clientPlaceholders` list in `src/lib/handlebars.ts`. Any new placeholder must be added there **and** handled in `src/components/ContentInjector.tsx`.

### Add a redirect

All redirects live in `next.config.ts` under `async redirects()`. Add to the appropriate section (blog, product migration, slug change, missing index). Use `permanent: true` unless there's a specific reason not to. Requires a redeploy to take effect.

## Downstream updates

> **⚠️ IMPORTANT — do not skip this section.** When a page URL or major concept changes, the items below may also need updating. They are **not** auto-synced, and missing them is the single most common source of broken links and stale references across the Doubleword ecosystem. Run through this checklist on every non-trivial change.

- **[`doublewordai/batch-skill`](https://github.com/doublewordai/batch-skill)** (agents skill): `SKILL.md` contains explicit links to doc pages. Grep it for the affected slug and update.
- **`llms.txt`**: Auto-generated from Sanity by `src/app/llms.txt/route.ts`. No manual action, but sanity-check the output after the change.
- **Search index**: Rebuilt at build time by `scripts/build-search-index.mjs`. No manual action.
- **External SDK docs and blog posts**: Search the `doublewordai` org on GitHub for the old slug. Update or rely on the redirect.
- **Sitemap**: Auto-generated by `src/app/sitemap.ts`.
- **Marketing site / blog**: Check `doubleword.ai` and `blog.doubleword.ai` for inbound links.

## Verifying changes

Every doc change should be verified against this checklist before merging:

1. **Does it render?** `npm run dev` and visit the page. Drafts show by default from Sanity.
2. **Does `.md` work?** Visit `/<product>/<slug>.md` — the docs site exposes raw markdown via `next.config.ts` rewrites, and AI agents use this.
3. **Does the sidebar show it?** Check the left nav under the right category. If not: the page may be in the `archive` category, or the `order` field may be misconfigured, or the category may not exist.
4. **Do old URLs still resolve?** For any renamed slug, hit the old URL and confirm 308.
5. **Do internal markdown links still resolve?** Grep the body of other Sanity pages for the old slug — `*[_type == "docPage"][body match "old-slug"]` in Sanity Vision is fastest.
6. **Does the build pass?** `npm run build`. Catches TypeScript errors in the frontend code and any search-index build failures.

## Key files reference

```
src/
├── sanity/
│   ├── lib/queries.ts          # GROQ queries — edit when the content model grows
│   └── types.ts                # Manually-typed Sanity shapes (TypeGen later)
├── lib/
│   ├── external-docs.ts        # External repo sources (dw-cli etc.)
│   ├── inference-api-sidebar.ts # Sidebar grouping; `archive` category is ignored here
│   ├── model-artifacts.ts      # Auto-generated model pages from API
│   └── handlebars.ts           # Server-side template helpers
├── app/
│   ├── lib/
│   │   ├── remark-admonitions.ts
│   │   └── remark-code-tabs.ts
│   ├── api/
│   │   ├── markdown/[product]/[...slug]/route.ts  # `.md` endpoint
│   │   ├── revalidate/route.ts                     # Sanity webhook
│   │   └── models/route.ts                         # Proxies DW API
│   ├── llms.txt/route.ts       # llms.txt generator
│   └── [product]/[...slug]/page.tsx  # Main doc page route
next.config.ts                  # Redirects + markdown URL rewrites
```

## Local development

```bash
npm install
npm run dev        # localhost:3000, shows Sanity drafts
npm run build      # production build (also rebuilds search index)
npm run test       # vitest
npm run lint       # eslint
```

Draft content from Sanity shows by default in dev. There is no separate "preview mode" to toggle.

## Environment variables

Required for local dev:

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=g1zo7y59
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_REVALIDATE_SECRET=<shared secret>
DOUBLEWORD_SYSTEM_API_KEY=<api key for model data>
```

Without `DOUBLEWORD_SYSTEM_API_KEY`, model pages render empty.

## Traps and gotchas

- **Deleting a Sanity page breaks inbound links.** Archive (move to `archive` category) unless you're certain nothing points to it.
- **Renaming without a redirect is silent breakage.** The only indicator is analytics 404s.
- **Currency in markdown.** Escape `$` as `\$` — bare `$` triggers math mode.
- **Image filenames are case-sensitive.** `Diagram.png` and `diagram.png` are different.
- **`dw-cli` edits in this repo do nothing.** That content comes from the [dw CLI repo](https://github.com/doublewordai/dw).
- **Model pages cannot be edited in Sanity.** They're synthesized. Edit the API.
- **Handlebars errors surface only in the console**, not the page. Check dev server logs.
- **The `.md` suffix is not universal.** Archive-category pages and auto-generated model pages serve markdown; custom Next.js route handlers (like `/inference-api/api-reference`) may not. Test before relying on it.
