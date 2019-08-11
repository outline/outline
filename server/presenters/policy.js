// @flow
import { User } from '../models';

type Policy = { id: string, abilities: { [key: string]: boolean } };

export default function present(user: User, objects: Object[]): Policy[] {
  const { serialize } = require('../policies');

  return objects.map(object => ({
    id: object.id,
    abilities: serialize(user, object),
  }));
}
