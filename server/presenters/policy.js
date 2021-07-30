// @flow
import { User } from "../models";
import serialize from "../policies/serializer";

type Policy = { id: string, abilities: { [key: string]: boolean } };

export default function present(user: User, objects: Object[]): Policy[] {
  return objects.map((object) => ({
    id: object.id,
    abilities: serialize(user, object),
  }));
}
