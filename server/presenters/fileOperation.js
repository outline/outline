// @flow
import { FileOperation } from "../models";
import { presentCollection, presentUser } from ".";

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
