// @flow
import { ApiKey } from "../models";

export default function present(key: ApiKey) {
  return {
    id: key.id,
    name: key.name,
    secret: key.secret,
  };
}
