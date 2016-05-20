var marked = require('marked');
import Document from './models/Document';

export function presentUser(user) {
  return new Promise(async (resolve, reject) => {
    resolve({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatarUrl: user.slackData.profile.image_192,
    });
  });
}

export function presentTeam(team) {
  return new Promise(async (resolve, reject) => {
    resolve({
      id: team.id,
      name: team.name,
    });
  });
}

export function presentAtlas(atlas, includeRecentDocuments=false) {
  return new Promise(async (resolve, reject) => {
    const data = {
      id: atlas.id,
      name: atlas.name,
      description: atlas.description,
      type: atlas.type,
    }

    if (includeRecentDocuments) {
      const documents = await Document.findAll({
        where: {
          atlasId: atlas.id,
        },
        limit: 10,
      });

      let recentDocuments = [];
      await Promise.all(documents.map(async (document) => {
        recentDocuments.push(await presentDocument(document));
      }))
      data.recentDocuments = recentDocuments;
    }

    resolve(data);
  });
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
    data.atlas = await presentAtlas(atlas, false);
  }

  return data;
}
