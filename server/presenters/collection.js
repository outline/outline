// @flow
import { Collection } from '../models';
import naturalSort from '../../shared/utils/naturalSort';

type Document = {
  children: Document[],
  id: string,
  title: string,
  url: string,
};

const sortDocuments = (documents: Document[]): Document[] => {
  const orderedDocs = naturalSort(documents, 'title');

  return orderedDocs.map(document => ({
    ...document,
    children: sortDocuments(document.children),
  }));
};

export default function present(collection: Collection) {
  const data = {
    id: collection.id,
    url: collection.url,
    name: collection.name,
    description: collection.description,
    color: collection.color || '#4E5C6E',
    type: collection.type,
    private: collection.private,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    deletedAt: collection.deletedAt,
    documents: undefined,
  };

  if (collection.type === 'atlas') {
    // Force alphabetical sorting
    data.documents = sortDocuments(collection.documentStructure);
  }

  return data;
}
