// @flow
import { User } from '../models';

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
};

export default (
  ctx: Object,
  user: User,
  options: Options = {}
): ?UserPresentation => {
  const userData = {};
  userData.id = user.id;
  userData.createdAt = user.createdAt;
  userData.name = user.name;
  userData.isAdmin = user.isAdmin;
  userData.isSuspended = user.isSuspended;
  userData.avatarUrl =
    user.avatarUrl || (user.slackData ? user.slackData.image_192 : null);

  if (options.includeDetails) {
    userData.email = user.email;
  }

  return userData;
};
