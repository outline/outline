// @flow
import naturalSort from "../../shared/utils/naturalSort";
import { Collection } from "../models";

type Document = {
  children: Document[],
  id: string,
  title: string,
  url: string,
};

const sortDocuments = (documents: Document[], sort): Document[] => {
  const orderedDocs = naturalSort(documents, sort.field, {
    direction: sort.direction,
  });

  return orderedDocs.map((document) => ({
    ...document,
    children: sortDocuments(document.children, sort),
  }));
};

export default function present(collection: Collection) {
  const data = {
    id: collection.id,
    url: collection.url,
    name: collection.name,
    description: collection.description,
    sort: collection.sort,
    icon: collection.icon,
    color: collection.color || "#4E5C6E",
    private: collection.private,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    deletedAt: collection.deletedAt,
    documents: collection.documentStructure || [],
  };

  // Handle the "sort" field being empty here for backwards compatability
  if (!data.sort) {
    data.sort = { field: "title", direction: "asc" };
  }

  // "index" field is manually sorted and is represented by the documentStructure
  // already saved in the database, no further sort is needed
  if (data.sort.field !== "index") {
    data.documents = sortDocuments(collection.documentStructure, data.sort);
  }

  return data;
}
