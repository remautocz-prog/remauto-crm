import {
  DEAL_TYPE_SUGGESTED_TEMPLATE_CATEGORIES,
} from "@/lib/constants/document-template-data-source";
import type { DocumentTemplateCategory } from "@/lib/constants/document-templates";
import type { DocumentTemplate } from "@/lib/types/document-templates";

export function sortTemplatesForGeneration(
  templates: DocumentTemplate[],
  context?: { dealType?: string | null }
) {
  const suggestedCategories =
    (context?.dealType &&
      DEAL_TYPE_SUGGESTED_TEMPLATE_CATEGORIES[context.dealType]) ||
    [];

  const suggested: DocumentTemplate[] = [];
  const other: DocumentTemplate[] = [];

  for (const template of templates) {
    if (
      suggestedCategories.includes(
        template.category as DocumentTemplateCategory
      )
    ) {
      suggested.push(template);
    } else {
      other.push(template);
    }
  }

  suggested.sort((a, b) => a.name.localeCompare(b.name));
  other.sort((a, b) => a.name.localeCompare(b.name));

  return { suggested, other, suggestedCategories };
}

export function pickDefaultTemplateId(
  templates: DocumentTemplate[],
  context?: {
    dealType?: string | null;
    preferredTemplateId?: string | null;
  }
) {
  if (
    context?.preferredTemplateId &&
    templates.some((item) => item.id === context.preferredTemplateId)
  ) {
    return context.preferredTemplateId;
  }

  const { suggested } = sortTemplatesForGeneration(templates, context);
  return suggested[0]?.id ?? templates[0]?.id ?? "";
}
