// @flow
import policy from './policy';
import { Document, Revision, User } from '../models';

const { allow, cannot } = policy;

allow(User, 'create', Document);

allow(
  User,
  ['read', 'update', 'delete', 'share'],
  Document,
  (user, document) => {
    if (document.collection) {
      if (cannot(user, 'read', document.collection)) return false;
    }

    return user.teamId === document.teamId;
  }
);

allow(
  Document,
  'restore',
  Revision,
  (document, revision) => document.id === revision.documentId
);
