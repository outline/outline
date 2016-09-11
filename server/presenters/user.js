const presentUser = (ctx, user) => {
  ctx.cache.set(user.id, user);

  return new Promise(async (resolve, _reject) => {
    const data = {
      id: user.id,
      username: user.username,
      name: user.name,
      avatarUrl: user.slackData ? user.slackData.image_192 : null,
    };
    resolve(data);
  });
};

export default presentUser;
