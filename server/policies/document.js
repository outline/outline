// @flow
import policy from './policy';
import Document from '../models/Document';
import User from '../models/User';

const { allow } = policy;

allow(User, 'create', Document);

allow(
  User,
  ['read', 'update', 'delete'],
  Document,
  (user, document) => user.teamId === document.teamId
);
