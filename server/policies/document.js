// @flow
import invariant from 'invariant';
import policy from './policy';
import { Document, Revision, User } from '../models';

const { allow, cannot } = policy;

allow(User, 'create', Document);

allow(User, ['read', 'share'], Document, (user, document, { collection }) => {
  // existance of collection option is not required here to account for share tokens
  if (collection && cannot(user, 'read', collection)) {
    return false;
  }

  return user.teamId === document.teamId;
});

// the collection associated with the document must be passed in options, it must
// be queried withMembership scope to include the models needed to authorize
allow(User, ['update', 'move'], Document, (user, document, { collection }) => {
  invariant(
    collection,
    'collection is missing, did you forget to include in the query scope?'
  );
  if (cannot(user, 'update', collection)) return false;
  if (document.archivedAt) return false;

  return user.teamId === document.teamId;
});

// the collection associated with the document must be passed in options, it must
// be queried withMembership scope to include the models needed to authorize
allow(User, ['delete'], Document, (user, document, { collection }) => {
  // allow deleting document without a collection
  if (collection && cannot(user, 'update', collection)) return false;
  if (document.archivedAt) return false;

  return user.teamId === document.teamId;
});

allow(User, 'archive', Document, (user, document, { collection }) => {
  invariant(
    collection,
    'collection is missing, did you forget to include in the query scope?'
  );
  if (cannot(user, 'update', collection)) return false;

  if (!document.publishedAt) return false;
  if (document.archivedAt) return false;

  return user.teamId === document.teamId;
});

allow(User, 'unarchive', Document, (user, document, { collection }) => {
  invariant(
    collection,
    'collection is missing, did you forget to include in the query scope?'
  );
  if (cannot(user, 'update', collection)) return false;

  if (!document.archivedAt) return false;

  return user.teamId === document.teamId;
});

allow(
  Document,
  'restore',
  Revision,
  (document, revision) => document.id === revision.documentId
);
