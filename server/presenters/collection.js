// @flow
import { Collection } from '../models';
import presentDocument from './document';
import naturalSort from '../../shared/utils/naturalSort';

type Document = {
  children: Document[],
  id: string,
  title: string,
  url: string,
};

const sortDocuments = (documents: Document[]) => {
  const orderedDocs = naturalSort(documents, 'title');
  return orderedDocs.map(document => ({
    ...document,
    children: sortDocuments(document.children),
  }));
};

async function present(ctx: Object, collection: Collection) {
  ctx.cache.set(collection.id, collection);

  const data = {
    id: collection.id,
    url: collection.url,
    name: collection.name,
    description: collection.description,
    color: collection.color || '#4E5C6E',
    type: collection.type,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    recentDocuments: undefined,
    documents: undefined,
  };

  if (collection.type === 'atlas') {
    // Force alphabetical sorting
    data.documents = sortDocuments(collection.documentStructure);
  }

  if (collection.documents) {
    data.recentDocuments = await Promise.all(
      collection.documents.map(
        async document => await presentDocument(ctx, document)
      )
    );
  }

  return data;
}

export default present;
