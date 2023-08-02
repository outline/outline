import { traceFunction } from "@server/logging/tracing";
import { Revision } from "@server/models";
import presentUser from "./user";

async function presentRevision(revision: Revision, diff?: string) {
  return {
    id: revision.id,
    documentId: revision.documentId,
    title: revision.title,
    text: revision.text,
    html: diff,
    createdAt: revision.createdAt,
    createdBy: presentUser(revision.user),
  };
}

export default traceFunction({
  spanName: "presenters",
})(presentRevision);
