// @flow
import { User } from "../models";

type Options = {
  includeDetails?: boolean,
};

type UserPresentation = {
  id: string,
  name: string,
  avatarUrl: ?string,
  email?: string,
  isAdmin: boolean,
  isSuspended: boolean,
  language: string,
};

export default (user: User, options: Options = {}): ?UserPresentation => {
  const userData = {};
  userData.id = user.id;
  userData.createdAt = user.createdAt;
  userData.lastActiveAt = user.lastActiveAt;
  userData.name = user.name;
  userData.isAdmin = user.isAdmin;
  userData.isSuspended = user.isSuspended;
  userData.avatarUrl = user.avatarUrl;
  userData.language = user.language;

  if (options.includeDetails) {
    userData.email = user.email;
  }

  return userData;
};
