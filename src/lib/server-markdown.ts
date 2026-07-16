import type { ModelsResponse } from "@/lib/models";
import { buildTemplateContext, templateMarkdown } from "@/lib/handlebars";
import { renderReasoningCapabilitiesMatrix } from "@/lib/model-artifacts";

const REASONING_MATRIX_PLACEHOLDER = /{{\s*reasoningCapabilitiesMatrix\s*}}/;

export async function renderServerMarkdownTemplates(
  content: string,
  modelsResponse: ModelsResponse,
): Promise<string> {
  const templateContext = buildTemplateContext(modelsResponse);

  if (REASONING_MATRIX_PLACEHOLDER.test(content)) {
    templateContext.reasoningCapabilitiesMatrix = renderReasoningCapabilitiesMatrix(
      modelsResponse.models,
    );
  }

  return templateMarkdown(content, templateContext);
}
