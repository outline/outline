// @flow
import { Revision } from '../models';
import presentUser from './user';

export default function present(revision: Revision) {
  return {
    id: revision.id,
    documentId: revision.documentId,
    title: revision.title,
    text: revision.text,
    createdAt: revision.createdAt,
    createdBy: presentUser(revision.user),
  };
}
