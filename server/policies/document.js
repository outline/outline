// @flow
import policy from './policy';
import { Document, Revision, User } from '../models';

const { allow } = policy;

allow(User, 'create', Document);

allow(
  User,
  ['read', 'update', 'delete', 'share'],
  Document,
  (user, document) => user.teamId === document.teamId
);

allow(
  Document,
  'restore',
  Revision,
  (document, revision) => document.id === revision.documentId
);
