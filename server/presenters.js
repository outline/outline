import _orderBy from 'lodash.orderby';
import { Document, Atlas } from './models';

export function presentUser(user) {
  return new Promise(async (resolve, reject) => {
    const data = {
      id: user.id,
      name: user.name,
      username: user.username,
      avatarUrl: user.slackData.image_192,
    };
    resolve(data);
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

    if (atlas.type === 'atlas') {
      // Todo replace with `.atlasStructure`
      data.structure = await atlas.buildStructure();
    }

    if (includeRecentDocuments) {
      const documents = await Document.findAll({
        where: {
          atlasId: atlas.id,
        },
        limit: 10,
        order: [
          ['updatedAt', 'DESC'],
        ],
      });

      let recentDocuments = [];
      await Promise.all(documents.map(async (document) => {
        recentDocuments.push(await presentDocument(document, true));
      }))
      data.recentDocuments = _orderBy(recentDocuments, ['updatedAt'], ['desc']);
    }

    resolve(data);
  });
}

export async function presentDocument(document, includeAtlas=false) {
  const data = {
    id: document.id,
    url: document.buildUrl(),
    private: document.private,
    title: document.title,
    text: document.text,
    html: document.html,
    preview: document.preview,
    private: document.private,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    atlas: document.atlasId,
    team: document.teamId,
  }

  if (includeAtlas) {
    const atlas = await Atlas.findOne({ where: {
      id: document.atlasId,
    }});
    data.atlas = await presentAtlas(atlas, false);
  }

  const user = await document.getUser();
  data.user = await presentUser(user);

  return data;
}
