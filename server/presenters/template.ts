import type { Template } from "@server/models";
import presentUser from "./user";

type Options = {
  /** The number of direct child templates, when known. */
  childCount?: number;
};

function presentTemplate(template: Template, options?: Options) {
  return {
    id: template.id,
    url: template.path,
    urlId: template.urlId,
    title: template.title,
    data: template.content,
    icon: template.icon,
    color: template.color,
    createdAt: template.createdAt,
    createdBy: presentUser(template.createdBy),
    updatedAt: template.updatedAt,
    updatedBy: presentUser(template.updatedBy),
    deletedAt: template.deletedAt,
    publishedAt: template.publishedAt,
    fullWidth: template.fullWidth,
    collectionId: template.collectionId,
    parentDocumentId: template.parentDocumentId,
    ...(options?.childCount !== undefined
      ? { childCount: options.childCount }
      : {}),
  };
}

export default presentTemplate;
