// @flow
import { Revision } from "../models";
import presentUser from "./user";

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
