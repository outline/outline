// @flow
import policy from './policy';
import { Document, Revision, User } from '../models';

const { allow, authorize } = policy;

allow(User, 'create', Document);

allow(
  User,
  ['read', 'update', 'delete', 'share'],
  Document,
  (user, document) => {
    if (document.collection) {
      authorize(user, 'read', document.collection);
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
