// @flow
import policy from './policy';
import Document from '../models/Document';
import User from '../models/User';

const { allow } = policy;

allow(
  User,
  ['create', 'read', 'update', 'delete'],
  Document,
  (user, doc) => user.teamId === doc.teamId
);
