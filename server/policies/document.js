// @flow
import policy from './policy';
import { Document, User } from '../models';

const { allow } = policy;

allow(User, 'create', Document);

allow(
  User,
  ['read', 'update', 'delete'],
  Document,
  (user, document) => user.teamId === document.teamId
);
