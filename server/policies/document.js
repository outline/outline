// @flow
import invariant from 'invariant';
import policy from './policy';
import { Document, Revision, User } from '../models';

const { allow, cannot } = policy;

allow(User, 'create', Document);

allow(User, ['read', 'download'], Document, (user, document) => {
  // existance of collection option is not required here to account for share tokens
  if (document.collection && cannot(user, 'read', document.collection)) {
    return false;
  }

  return user.teamId === document.teamId;
});

allow(
  User,
  ['share', 'pin', 'unpin', 'star', 'unstar'],
  Document,
  (user, document) => {
    if (document.archivedAt) return false;

    // existance of collection option is not required here to account for share tokens
    if (document.collection && cannot(user, 'read', document.collection)) {
      return false;
    }

    return user.teamId === document.teamId;
  }
);

allow(User, 'update', Document, (user, document) => {
  invariant(
    document.collection,
    'collection is missing, did you forget to include in the query scope?'
  );
  if (cannot(user, 'update', document.collection)) return false;
  if (document.archivedAt) return false;

  return user.teamId === document.teamId;
});

allow(User, 'move', Document, (user, document) => {
  invariant(
    document.collection,
    'collection is missing, did you forget to include in the query scope?'
  );
  if (cannot(user, 'update', document.collection)) return false;
  if (document.archivedAt) return false;
  if (!document.publishedAt) return false;

  return user.teamId === document.teamId;
});

allow(User, 'delete', Document, (user, document) => {
  // allow deleting document without a collection
  if (document.collection && cannot(user, 'update', document.collection))
    return false;
  if (document.archivedAt) return false;

  return user.teamId === document.teamId;
});

allow(User, 'archive', Document, (user, document) => {
  invariant(
    document.collection,
    'collection is missing, did you forget to include in the query scope?'
  );
  if (cannot(user, 'update', document.collection)) return false;

  if (!document.publishedAt) return false;
  if (document.archivedAt) return false;

  return user.teamId === document.teamId;
});

allow(User, 'unarchive', Document, (user, document) => {
  invariant(
    document.collection,
    'collection is missing, did you forget to include in the query scope?'
  );
  if (cannot(user, 'update', document.collection)) return false;

  if (!document.archivedAt) return false;

  return user.teamId === document.teamId;
});

allow(
  Document,
  'restore',
  Revision,
  (document, revision) => document.id === revision.documentId
);
