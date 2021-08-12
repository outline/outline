// @flow
import { Export } from "../models";
import { presentCollection, presentUser } from ".";
export default function present(data: Export) {
  return {
    id: data.id,
    state: data.state,
    collection: data.collection ? presentCollection(data.collection) : null,
    key: data.key,
    url: data.url,
    size: data.size,
    user: presentUser(data.user),
    createdAt: data.createdAt,
  };
}
