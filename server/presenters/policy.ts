import { User } from "@server/models";

type Policy = {
  id: string;
  abilities: Record<string, boolean>;
};

export default function present(
  // @ts-expect-error ts-migrate(2749) FIXME: 'User' refers to a value, but is being used as a t... Remove this comment to see the full error message
  user: User,
  objects: Record<string, any>[]
): Policy[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { serialize } = require("../policies");

  return objects.map((object) => ({
    id: object.id,
    abilities: serialize(user, object),
  }));
}
