// @flow
import { User } from '../models';

type Options = {
  includeDetails?: boolean,
};

type UserPresentation = {
  id: string,
  username: string,
  name: string,
  avatarUrl: ?string,
  email?: string,
  isAdmin?: boolean,
};

export default (
  ctx: Object,
  user: User,
  options: Options = {}
): UserPresentation => {
  ctx.cache.set(user.id, user);

  const userData = {};
  userData.id = user.id;
  userData.username = user.username;
  userData.name = user.name;
  userData.avatarUrl =
    user.avatarUrl || (user.slackData ? user.slackData.image_192 : null);

  if (options.includeDetails) {
    userData.isAdmin = user.isAdmin;
    userData.email = user.email;
  }

  return userData;
};
