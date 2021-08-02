// @flow
import { Export } from "../models";

export default function present(key: Export) {
  return {
    id: key.id,
    state: key.state,
    collectionId: key.collectionId,
    key: key.key,
    url: key.url,
    size: key.size,
  };
}
