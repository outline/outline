import _ from 'lodash';
import { Document, Collection, User } from './models';

import presentUser from './presenters/user';

export { presentUser };

export async function presentTeam(ctx, team) {
  ctx.cache.set(team.id, team);

  return {
    id: team.id,
    name: team.name,
  };
}

export async function presentDocument(ctx, document, options) {
  options = {
    includeCollection: true,
    includeCollaborators: true,
    ...options,
  };
  ctx.cache.set(document.id, document);

  const data = {
    id: document.id,
    url: document.getUrl(),
    private: document.private,
    title: document.title,
    text: document.text,
    html: document.html,
    preview: document.preview,
    createdAt: document.createdAt,
    createdBy: undefined,
    updatedAt: document.updatedAt,
    updatedBy: undefined,
    team: document.teamId,
    collaborators: [],
  };

  if (options.includeCollection) {
    data.collection = await ctx.cache.get(document.atlasId, async () => {
      const collection = await Collection.findOne({
        where: {
          id: document.atlasId,
        },
      });
      return await presentCollection(ctx, collection);
    });
  }

  if (options.includeCollaborators) {
    // This could be further optimized by using ctx.cache
    data.collaborators = await User.findAll({
      where: {
        id: {
          $in: document.collaboratorIds || [],
        },
      },
    }).map(user => presentUser(ctx, user));
  }

  const createdBy = await ctx.cache.get(
    document.createdById,
    async () => await User.findById(document.createdById)
  );
  data.createdBy = await presentUser(ctx, createdBy);

  const updatedBy = await ctx.cache.get(
    document.lastModifiedById,
    async () => await User.findById(document.lastModifiedById)
  );
  data.updatedBy = await presentUser(ctx, updatedBy);

  return data;
}

export async function presentCollection(
  ctx,
  collection,
  includeRecentDocuments = false
) {
  ctx.cache.set(collection.id, collection);

  const data = {
    id: collection.id,
    url: collection.getUrl(),
    name: collection.name,
    description: collection.description,
    type: collection.type,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  };

  if (collection.type === 'atlas') {
    data.navigationTree = collection.navigationTree;
    data.documents = await collection.getDocumentsStructure();
  }

  if (includeRecentDocuments) {
    const documents = await Document.findAll({
      where: {
        atlasId: collection.id,
      },
      limit: 10,
      order: [['updatedAt', 'DESC']],
    });

    const recentDocuments = [];
    await Promise.all(
      documents.map(async document => {
        recentDocuments.push(
          await presentDocument(ctx, document, {
            includeCollaborators: true,
          })
        );
      })
    );
    data.recentDocuments = _.orderBy(recentDocuments, ['updatedAt'], ['desc']);
  }

  return data;
}

export function presentApiKey(ctx, key) {
  return {
    id: key.id,
    name: key.name,
    secret: key.secret,
  };
}
