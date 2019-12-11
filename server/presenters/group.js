// @flow
import { Group } from '../models';

export default function present(group: Group) {
  return {
    id: group.id,
    name: group.name,
  };
}
