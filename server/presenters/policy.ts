import { User } from "../models";
type Policy = {
  id: string;
  abilities: Record<string, boolean>;
};
export default function present(
  user: User,
  objects: Record<string, any>[]
): Policy[] {
  const { serialize } = require("../policies");

  return objects.map((object) => ({
    id: object.id,
    abilities: serialize(user, object),
  }));
}
