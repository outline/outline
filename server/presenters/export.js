// @flow
import { Export } from "../models";

export default function present(key: Export) {
  return {
    id: key.id,
    state: key.state,
    collection: key.collection
      ? {
          name: key.collection.name,
          id: key.collection.id,
          url: key.collection.url,
        }
      : null,
    key: key.key,
    url: key.url,
    size: key.size,
    user: {
      name: key.user.name,
      id: key.user.id,
      avatarUrl: key.user.avatarUrl,
    },
    createdAt: key.createdAt,
  };
}
