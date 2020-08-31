// @flow
import { Collection } from '../models';

type Document = {
  children: Document[],
  id: string,
  title: string,
  url: string,
};

export default function present(collection: Collection) {
  const data = {
    id: collection.id,
    url: collection.url,
    name: collection.name,
    description: collection.description,
    icon: collection.icon,
    color: collection.color || '#4E5C6E',
    private: collection.private,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    deletedAt: collection.deletedAt,
    documents: undefined,
  };

  if (collection.type === 'atlas') {
    data.documents = collection.documentStructure
      ? collection.documentStructure
      : [];
  }

  return data;
}
