// @flow
import { View } from "../models";
import { presentUser } from "../presenters";

export default function present(view: View) {
  return {
    id: view.id,
    documentId: view.documentId,
    count: view.count,
    firstViewedAt: view.createdAt,
    lastViewedAt: view.updatedAt,
    user: presentUser(view.user),
  };
}
