// @flow
import { map } from 'lodash';
import { User } from '../models';
import { serialize } from '../policies';

export default function present(user: User, objects: Object[]) {
  return map(objects, object => serialize(user, object));
}
