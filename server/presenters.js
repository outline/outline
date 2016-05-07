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

export function presentAtlas(atlas) {
  return {
    id: atlas.id,
    name: atlas.name,
    description: atlas.description,
    type: atlas.type,
    recentDocuments: atlas.getRecentDocuments(),
  }
}