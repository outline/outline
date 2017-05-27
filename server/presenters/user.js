// @flow
import User from '../models/User';

async function presentUser(ctx: Object, user: User) {
  ctx.cache.set(user.id, user);

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    avatarUrl: user.slackData ? user.slackData.image_192 : null,
  };
}

export default presentUser;
