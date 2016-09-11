const presentUser = (ctx, user) => {
  ctx.cache.set(user.id, user);

  return new Promise(async (resolve, _reject) => {
    const data = {
      id: user.id,
      name: user.name,
      username: user.username,
      avatarUrl: user.slackData.image_192,
    };
    resolve(data);
  });
};

export default presentUser;
