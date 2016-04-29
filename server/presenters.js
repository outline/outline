export function presentUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    avatarUrl: user.slackData.profile.image_192,
  };
}

export function presentTeam(team) {
  return {
    id: team.id,
    name: team.name,
  };
}
