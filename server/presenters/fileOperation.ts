import { FileOperation } from "../models";
import { presentCollection, presentUser } from ".";

// @ts-expect-error ts-migrate(2749) FIXME: 'FileOperation' refers to a value, but is being us... Remove this comment to see the full error message
export default function present(data: FileOperation) {
  return {
    id: data.id,
    type: data.type,
    state: data.state,
    collection: data.collection ? presentCollection(data.collection) : null,
    size: data.size,
    user: presentUser(data.user),
    createdAt: data.createdAt,
  };
}
