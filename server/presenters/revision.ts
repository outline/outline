import { Revision } from "@server/models";
import presentUser from "./user";

export default async function present(revision: Revision, diff?: string) {
  await revision.migrateVersion();
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
