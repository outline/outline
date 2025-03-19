import { traceFunction } from "@server/logging/tracing";
import { Template } from "@server/models";
import { APIContext } from "@server/types";
import presentUser from "./user";

async function presentTemplate(
  ctx: APIContext | undefined,
  template: Template
) {
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
    publishedAt: template.publishedAt,
    deletedAt: template.deletedAt,
    fullWidth: template.fullWidth,
    collectionId: template.collectionId,
  };
}

export default traceFunction({
  spanName: "presenters",
})(presentTemplate);
