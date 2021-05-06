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
  isViewer: boolean,
  language: string,
};

export default (user: User, options: Options = {}): ?UserPresentation => {
  const userData = {};
  userData.id = user.id;
  userData.createdAt = user.createdAt;
  userData.name = user.name;
  userData.isAdmin = user.isAdmin;
  userData.isViewer = user.isViewer;
  userData.isSuspended = user.isSuspended;
  userData.avatarUrl = user.avatarUrl;

  if (options.includeDetails) {
    userData.lastActiveAt = user.lastActiveAt;
    userData.email = user.email;
    userData.language =
      user.language || process.env.DEFAULT_LANGUAGE || "en_US";
  }

  return userData;
};
