// @flow
import { Revision } from '../models';

function present(ctx: Object, revision: Revision) {
  return {
    id: revision.id,
    title: revision.title,
    text: revision.text,
    createdAt: revision.createdAt,
    updatedAt: revision.updatedAt,
  };
}

export default present;
