import { ApiKey } from "@server/models";

// @ts-expect-error ts-migrate(2749) FIXME: 'ApiKey' refers to a value, but is being used as a... Remove this comment to see the full error message
export default function present(key: ApiKey) {
  return {
    id: key.id,
    name: key.name,
    secret: key.secret,
    createdAt: key.createdAt,
  };
}
