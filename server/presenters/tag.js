// @flow
import { Tag } from '../models';

function present(ctx: Object, tag: Tag) {
  return {
    id: tag.id,
    name: tag.name,
  };
}

export default present;
