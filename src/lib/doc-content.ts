import { templateMarkdown, type TemplateContext } from "@/lib/handlebars";

export type DocImage = {
  filename: string;
  asset: { _id: string; url: string };
};

/**
 * Render a Sanity docPage body into the raw markdown served at `<slug>.md`.
 *
 * Applies Handlebars templating (model placeholders, pricing helpers) and
 * swaps local image filenames for their Sanity CDN URLs. Shared by the `.md`
 * endpoint and `llms-full.txt` so both produce byte-identical page content.
 */
export function renderDocBodyMarkdown(
  body: string,
  images: DocImage[] | undefined,
  templateContext: TemplateContext,
): string {
  let content = templateMarkdown(body, templateContext);

  if (images && images.length > 0) {
    const imageMap = new Map(
      images.filter((img) => img.filename).map((img) => [img.filename, img]),
    );
    imageMap.forEach((imageData, filename) => {
      const regex = new RegExp(`!\\[([^\\]]*)\\]\\(${filename}\\)`, "g");
      content = content.replace(regex, `![$1](${imageData.asset.url})`);
    });
  }

  return content;
}
