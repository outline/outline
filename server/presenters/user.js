// @flow
import User from '../models/User';

function present(ctx: Object, user: User) {
  ctx.cache.set(user.id, user);

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    avatarUrl: user.avatarUrl ||
      (user.slackData ? user.slackData.image_192 : null),
  };
}

export default present;
