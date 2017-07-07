// @flow
import _ from 'lodash';
import { Collection } from '../models';
import presentDocument from './document';

async function present(ctx: Object, collection: Collection) {
  ctx.cache.set(collection.id, collection);

  const data = {
    id: collection.id,
    url: collection.getUrl(),
    name: collection.name,
    description: collection.description,
    type: collection.type,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    recentDocuments: undefined,
    documents: undefined,
  };

  if (collection.type === 'atlas') {
    data.documents = await collection.getDocumentsStructure();
  }

  if (collection.documents) {
    data.recentDocuments = await Promise.all(
      collection.documents.map(
        async document =>
          await presentDocument(ctx, document, { includeCollaborators: true })
      )
    );
  }

  return data;
}

export default present;
