import _orderBy from 'lodash.orderby';
import { Document, Atlas } from './models';

export function presentUser(user) {
  return new Promise(async (resolve, _reject) => {
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
  return new Promise(async (resolve, _reject) => {
    resolve({
      id: team.id,
      name: team.name,
    });
  });
}

export async function presentDocument(document, includeCollection = false) {
  const data = {
    id: document.id,
    url: document.buildUrl(),
    private: document.private,
    title: document.title,
    text: document.text,
    html: document.html,
    preview: document.preview,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    collection: document.atlasId,
    team: document.teamId,
  };

  if (includeCollection) {
    const collection = await Atlas.findOne({ where: {
      id: document.atlasId,
    } });
    data.collection = await presentCollection(collection, false);
  }

  const user = await document.getUser();
  data.user = await presentUser(user);

  return data;
}

export function presentCollection(collection, includeRecentDocuments=false) {
  return new Promise(async (resolve, _reject) => {
    const data = {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      type: collection.type,
    };

    if (collection.type === 'atlas') {
      data.navigationTree = await collection.getStructure();
    }

    if (includeRecentDocuments) {
      const documents = await Document.findAll({
        where: {
          atlasId: collection.id,
        },
        limit: 10,
        order: [
          ['updatedAt', 'DESC'],
        ],
      });

      const recentDocuments = [];
      await Promise.all(documents.map(async (document) => {
        recentDocuments.push(await presentDocument(document, true));
      }));
      data.recentDocuments = _orderBy(recentDocuments, ['updatedAt'], ['desc']);
    }

    resolve(data);
  });
}
