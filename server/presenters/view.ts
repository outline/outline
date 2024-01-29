import { View } from "@server/models";
import { presentUser } from "../presenters";

export default function presentView(view: View) {
  return {
    id: view.id,
    documentId: view.documentId,
    count: view.count,
    firstViewedAt: view.createdAt,
    lastViewedAt: view.updatedAt,
    userId: view.userId,
    user: presentUser(view.user),
  };
}
