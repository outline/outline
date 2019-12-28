// @flow
import { View } from '../models';
import { presentUser } from '../presenters';

export default function present(view: View) {
  return {
    id: view.id,
    documentId: view.documentId,
    count: view.count,
    firstViewedAt: view.createdAt,
    lastEditingAt: view.lastEditingAt,
    lastViewedAt: view.updatedAt,
    user: presentUser(view.user),
  };
}
