function present(ctx, team) {
  ctx.cache.set(team.id, team);

  return {
    id: team.id,
    name: team.name,
  };
}

export default present;
