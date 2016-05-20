var marked = require('marked');

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

export function presentAtlas(atlas, includeRecentDocuments=true) {
  return {
    id: atlas.id,
    name: atlas.name,
    description: atlas.description,
    type: atlas.type,
    recentDocuments: atlas.getRecentDocuments(),
  }
}

export async function presentDocument(document, includeAtlas=false) {
  const data = {
    id: document.id,
    title: document.title,
    text: document.text,
    html: marked(document.text),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    atlas: document.atlaId,
    team: document.teamId,
  }

  if (includeAtlas) {
    const atlas = await document.getAtlas();
    data.atlas = presentAtlas(atlas, false);
  }

  return data;
}
