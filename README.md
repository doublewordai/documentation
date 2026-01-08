# Doubleword Documentation Site

A fully static, prerendered Next.js documentation site powered by Sanity CMS with webhook-based on-demand revalidation and dynamic content injection.

---

## For Content Authors

### Editing Content in Sanity Studio

Access the studio at `https://doubleword.sanity.studio/` (or your studio URL).

**Document Types:**
- **docPage** - Documentation pages (what you'll edit most)
- **category** - Sidebar sections
- **product** - Top-level products (Batches, Admin, etc.)
- **post** - Blog posts (can be linked to doc pages)

**docPage Fields:**
| Field | Purpose |
|-------|---------|
| title | Page title (shown in browser tab, TOC) |
| slug | URL path segment |
| product | Which product this belongs to |
| category | Sidebar section |
| order | Sort order within category |
| parent | For nested pages in sidebar |
| body | Markdown content |
| images | Upload images, reference by filename |
| sidebarLabel | Override title in sidebar |
| hideTitle | Don't show title on page |
| description | Meta description for SEO |

### Markdown Features

#### Basic Markdown

Standard GitHub-flavored markdown is supported:
- **Bold**, *italic*, ~~strikethrough~~
- [Links](url), `inline code`
- Lists, tables, blockquotes
- Headings (h2 and h3 appear in table of contents)

#### Images

1. Upload image in the "Images" field with a filename (e.g., `diagram.png`)
2. Reference in body: `![Alt text](diagram.png)`

The filename is automatically replaced with the Sanity CDN URL. Alt text and captions from Sanity are used.

#### Code Blocks

````markdown
```python
print("Hello, world!")
```
````

Supported languages: javascript, typescript, python, bash, json, jsx, tsx, yaml, shell, go, rust, sql, html, css, markdown, toml, dockerfile

#### Tabbed Code Blocks

Show the same example in multiple languages with synced tabs:

````markdown
```python tabs=example name=Python sync=lang
print("Hello")
```

```javascript tabs=example name=JavaScript sync=lang
console.log("Hello")
```

```go tabs=example name=Go sync=lang
fmt.Println("Hello")
```
````

- `tabs=` - Group ID (blocks with same ID become tabs)
- `name=` - Tab label
- `sync=` - Sync group (tabs with same sync value change together across the page)

#### Admonitions

Callout boxes for notes, warnings, etc.:

```markdown
:::note
This is a note.
:::

:::tip
This is a tip.
:::

:::warning
This is a warning.
:::

:::danger
This is dangerous!
:::

:::info
This is informational.
:::

:::caution
Be careful!
:::
```

Custom title:
```markdown
:::warning[Custom Title]
Warning content here.
:::
```

#### Footnotes

```markdown
This has a footnote[^1].

[^1]: This is the footnote content.
```

On desktop, footnotes appear as hover popups. On mobile, they appear at the bottom of the page.

#### Collapsible Sections

Use HTML `<details>` for collapsible content:

```markdown
<details>
<summary>Click to expand</summary>

Hidden content here. Supports **markdown**.

</details>
```

To include in table of contents, put a heading inside the summary:
```markdown
<details id="section-id">
<summary><h3>Section Title</h3></summary>

Content here.

</details>
```

### Dynamic Content

#### Server-side (Handlebars) - For Model Data

These are processed on page load and work without JavaScript. Model data is cached for 5 minutes (ISR)—after expiry, fresh data is fetched in the background.

**Model JSON structure** - Each model in `{{#each models}}` has this shape:

```json
{
  "id": "meta-llama/Llama-4-Scout-17B-16E-Instruct",
  "name": "Llama 4 Scout 17B 16E Instruct",
  "description": "A lightweight model optimized for...",
  "type": "chat",
  "capabilities": ["chat", "function_calling"],
  "pricing": {
    "realtime": {
      "input": 0.0000001,
      "output": 0.0000002
    },
    "batch1h": {
      "input": 0.00000008,
      "output": 0.00000016
    },
    "batch24h": {
      "input": 0.00000005,
      "output": 0.0000001
    }
  }
}
```

Note: `pricing.realtime`, `pricing.batch1h`, and `pricing.batch24h` may be `null` if that tier isn't available for a model.

**Loop through models:**
```markdown
{{#each models}}
- {{this.name}}: {{formatPricePer1M this.pricing.batch24h.input}} input
{{/each}}
```

**Conditionals:**
```markdown
{{#if this.pricing.realtime}}
Realtime available!
{{/if}}

{{#if this.description}}
{{this.description}}
{{/if}}
```

**Available helpers:**
| Helper | Example | Output |
|--------|---------|--------|
| `formatPricePer1M` | `{{formatPricePer1M 0.0000001}}` | `$0.10` |
| `formatPrice` | `{{formatPrice 1.5}}` | `$1.50` |
| `urlEncode` | `{{urlEncode "a/b"}}` | `a%2Fb` |
| `eq` | `{{#if (eq this.type "chat")}}` | Boolean |
| `json` | `{{json this}}` | JSON string |
| `hasCapability` | `{{#if (hasCapability this "vision")}}` | Boolean |

**Accessing model properties:**
```markdown
{{this.id}}                         → "meta-llama/Llama-4-Scout..."
{{this.name}}                       → "Llama 4 Scout 17B 16E Instruct"
{{this.description}}                → "A lightweight model..."
{{this.type}}                       → "chat"
{{this.pricing.realtime.input}}     → 0.0000001 (price per token)
{{this.pricing.batch1h.input}}      → 0.00000008
{{this.pricing.batch24h.output}}    → 0.0000001
{{formatPricePer1M this.pricing.batch24h.input}} → "$0.05"
```

**Index in loops:**
```markdown
{{#each models}}
<details id="model-{{@index}}">  <!-- @index is 0, 1, 2, ... -->
{{/each}}
```

#### Client-side - For User-specific Data

These appear in code blocks and are replaced when users interact:

**API Key:**
````markdown
```bash
curl -H "Authorization: Bearer {{apiKey}}" ...
```
````

When users click "Generate API Key" or log in, `{{apiKey}}` is replaced with their actual key.

**Selected Model:**
````markdown
```python
model = "{{selectedModel.id}}"
```
````

A model selector dropdown appears in the code block. When users select a model, placeholders are replaced.

**Available placeholders:**
- `{{apiKey}}` - User's API key
- `{{selectedModel.id}}` - Selected model ID
- `{{selectedModel.name}}` - Selected model name

### Publishing Workflow

1. **Edit** content in Sanity Studio
2. **Save** creates a draft
3. **Publish** makes content live and triggers webhook
4. **Site rebuilds** affected pages automatically (usually within seconds)

### Previewing Drafts Locally

To preview draft content before publishing, run the docs site locally:

```bash
git clone https://github.com/doublewordai/documentation.git
cd documentation
npm install
npm run dev
```

The dev server at `http://localhost:3000` will show draft content from Sanity. See [Development Commands](#development-commands) for more details.

*A simpler preview option (without running the dev server) is coming soon.*

### Tips

- Use h2 (`##`) and h3 (`###`) for headings that should appear in the table of contents
- Keep slugs URL-friendly (lowercase, hyphens, no special characters)
- Use the "sidebarLabel" field for shorter navigation labels
- Link related content using markdown links: `[See Authentication](/batches/authentication)`
- Test dynamic content locally before publishing - Handlebars errors will show in the console

### Troubleshooting

**Content not updating after publish:**
- Check that the webhook is configured in Sanity
- Verify the revalidation secret matches
- Wait 10-30 seconds for cache to clear

**Images not showing:**
- Make sure filename in body matches exactly (case-sensitive)
- Verify image was uploaded in the Images field

**Code blocks look broken:**
- Check for matching opening/closing backticks
- Ensure language is in the supported list
- For tabs, verify all blocks have the same `tabs=` value

**Handlebars errors:**
- Check browser console for error messages
- Verify helper names are spelled correctly
- Make sure conditionals have matching `{{/if}}`

---

## For Developers

### Architecture Overview

This is a Next.js 16 application using the App Router with:
- **Static Site Generation (SSG)** - All pages prerendered at build time
- **Sanity CMS** - Headless CMS for content management
- **Webhook-based revalidation** - Content updates trigger automatic page rebuilds
- **Dynamic content injection** - Server-side Handlebars templating + client-side placeholder replacement

### Project Structure

```
docs/
├── src/
│   ├── app/
│   │   ├── [product]/
│   │   │   ├── [...slug]/
│   │   │   │   └── page.tsx          # Documentation pages
│   │   │   ├── layout.tsx            # Product layout with sidebar
│   │   │   └── page.tsx              # Product landing (redirects to first doc)
│   │   ├── api/
│   │   │   ├── models/route.ts       # Proxies model data from Doubleword API
│   │   │   ├── revalidate/route.ts   # Sanity webhook handler
│   │   │   └── openapi/route.ts      # OpenAPI spec endpoint
│   │   ├── auth/callback/page.tsx    # OAuth callback handler
│   │   ├── lib/
│   │   │   ├── remark-admonitions.ts # Custom admonition syntax
│   │   │   └── remark-code-tabs.ts   # Tabbed code blocks
│   │   ├── layout.tsx                # Root layout with providers
│   │   ├── page.tsx                  # Homepage
│   │   └── globals.css               # All styles
│   ├── components/
│   │   ├── AuthProvider.tsx          # Auth context (API keys, OAuth)
│   │   ├── ConfigProvider.tsx        # App config (selected model)
│   │   ├── ContentInjector.tsx       # Client-side placeholder replacement
│   │   ├── MarkdownRenderer.tsx      # Markdown processing pipeline
│   │   ├── PageEnhancer.tsx          # Code tabs, footnote hovers
│   │   ├── ModelSelector.tsx         # Model dropdown in code blocks
│   │   ├── ApiKeyIndicator.tsx       # API key button in code blocks
│   │   ├── ApiKeyBanner.tsx          # "Generate API key" banner
│   │   ├── TableOfContents.tsx       # Right sidebar TOC
│   │   └── SidebarNav.tsx            # Left sidebar navigation
│   ├── lib/
│   │   ├── handlebars.ts             # Server-side templating
│   │   └── models.ts                 # Model types and fetching
│   └── sanity/
│       ├── lib/
│       │   ├── client.ts             # Sanity client configuration
│       │   └── queries.ts            # GROQ queries
│       ├── env.ts                    # Environment config
│       └── types.ts                  # Generated TypeScript types
├── .env.local                        # Environment variables
├── next.config.ts                    # Next.js configuration
└── package.json
```

### Key Systems

#### 1. Content Flow

```
Sanity CMS (edit)
    → Webhook fires on publish
    → /api/revalidate called
    → revalidateTag() purges cache
    → Next request rebuilds page
```

#### 2. Dynamic Content Injection

Content goes through two stages of processing:

**Server-side (Handlebars)** - Processed on each request with ISR caching:
- `{{#each models}}` - Loop through all models
- `{{this.name}}`, `{{this.id}}` - Model properties
- `{{formatPricePer1M this.pricing.batch24h.input}}` - Price formatting
- `{{urlEncode this.id}}` - URL encoding

Model data uses Next.js ISR with 5-minute revalidation (`revalidate: 300`). After the cache expires, the next request triggers a background refresh while serving stale data—no redeploy needed.

**Client-side (ContentInjector)** - Processed in browser:
- `{{apiKey}}` - User's API key (after login/generation)
- `{{selectedModel.id}}` - Currently selected model
- `{{selectedModel.name}}` - Model display name

#### 3. Markdown Processing Pipeline

```
Raw Markdown
    → remarkGfm (tables, strikethrough, etc.)
    → remarkDirective (:::admonition syntax)
    → remarkAdmonitions (custom admonition blocks)
    → remarkCodeTabs (tabbed code blocks)
    → rehypeSlug (heading IDs)
    → rehypeAutolinkHeadings (clickable headings)
    → rehypeShiki (syntax highlighting)
    → rehypeRaw (pass through HTML)
    → React components (custom img, pre, a, etc.)
```

### Environment Variables

```bash
# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=g1zo7y59
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_REVALIDATE_SECRET=your-webhook-secret

# Doubleword API (for model data)
DOUBLEWORD_SYSTEM_API_KEY=your-api-key
```

### Setting Up Sanity Webhook

1. Go to [Sanity Manage](https://www.sanity.io/manage) → Your Project → API → Webhooks
2. Create webhook:
   - **URL**: `https://your-domain.com/api/revalidate`
   - **Secret**: Same as `SANITY_REVALIDATE_SECRET`
   - **Trigger on**: Create, Update, Delete
   - **Projection**: `{_type}`

### Development Commands

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Adding New Features

**New Handlebars helper:**
```typescript
// src/lib/handlebars.ts
Handlebars.registerHelper('myHelper', function(value: string) {
  return value.toUpperCase()
})
```

**New remark plugin:**
1. Create plugin in `src/app/lib/remark-*.ts`
2. Add to `remarkPlugins` array in `MarkdownRenderer.tsx`

**New client-side placeholder:**
1. Add pattern to `ContentInjector.tsx`
2. Add to `clientPlaceholders` array in `handlebars.ts` (to preserve during server templating)

### Authentication Flow

Users can generate API keys directly from the docs site. The auth flow uses SSO cookies shared with the main Doubleword app:

```
User clicks "Generate API Key"
    → Check if already authenticated (GET /admin/api/v1/users/current/api-keys)
    → If authenticated: generate key directly
    → If not: redirect to app.doubleword.ai/authentication/sign_in
        → User logs in via Google/GitHub OAuth
        → Redirect back to /auth/callback
        → SSO cookie now set, can generate keys
```

**Key files:**
- `src/components/AuthProvider.tsx` - Auth context and API key generation
- `src/app/auth/callback/page.tsx` - OAuth callback handler
- `src/components/ApiKeyIndicator.tsx` - UI button in code blocks
- `src/components/ApiKeyBanner.tsx` - Banner prompting key generation

**Security notes:**
- Auth only works on `*.doubleword.ai` domains (enforced in `signIn()`)
- API keys are generated via `POST /admin/api/v1/users/current/api-keys`
- Keys are stored in React state only (not persisted to localStorage)
- In development mode, mock auth is available via `sessionStorage.dev_auth`
