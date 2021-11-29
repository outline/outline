import { Revision } from "@server/models";
import presentUser from "./user";

// @ts-expect-error ts-migrate(2749) FIXME: 'Revision' refers to a value, but is being used as... Remove this comment to see the full error message
export default async function present(revision: Revision) {
  await revision.migrateVersion();
  return {
    id: revision.id,
    documentId: revision.documentId,
    title: revision.title,
    text: revision.text,
    createdAt: revision.createdAt,
    createdBy: presentUser(revision.user),
  };
}
