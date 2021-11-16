import { View } from "../models";
import { presentUser } from "../presenters";

// @ts-expect-error ts-migrate(2749) FIXME: 'View' refers to a value, but is being used as a t... Remove this comment to see the full error message
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
