// @flow
import * as JSDiff from 'diff';
import { Revision } from '../models';
import presentUser from './user';

function counts(changes) {
  return changes.reduce(
    (acc, change) => {
      if (change.added) acc.added += change.value.length;
      if (change.removed) acc.removed += change.value.length;
      return acc;
    },
    {
      added: 0,
      removed: 0,
    }
  );
}

function present(ctx: Object, revision: Revision, previous?: Revision) {
  const prev = previous ? previous.text : '';

  return {
    id: revision.id,
    documentId: revision.documentId,
    title: revision.title,
    text: revision.text,
    createdAt: revision.createdAt,
    createdBy: presentUser(ctx, revision.user),
    diff: counts(JSDiff.diffChars(prev, revision.text)),
  };
}

export default present;
