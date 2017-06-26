import _ from 'lodash';
import { Document } from '../models';
import presentDocument from './document';

async function present(ctx, collection, includeRecentDocuments = false) {
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

  if (collection.type === 'atlas')
    data.navigationTree = collection.navigationTree;

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

export default present;
