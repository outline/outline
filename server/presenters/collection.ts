import naturalSort from "@shared/utils/naturalSort";
import { Collection } from "@server/models";

type Document = {
  children: Document[];
  id: string;
  title: string;
  url: string;
};

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'sort' implicitly has an 'any' type.
const sortDocuments = (documents: Document[], sort): Document[] => {
  const orderedDocs = naturalSort(documents, sort.field, {
    direction: sort.direction,
  });
  return orderedDocs.map((document) => ({
    ...document,
    children: sortDocuments(document.children, sort),
  }));
};

// @ts-expect-error ts-migrate(2749) FIXME: 'Collection' refers to a value, but is being used ... Remove this comment to see the full error message
export default function present(collection: Collection) {
  const data = {
    id: collection.id,
    url: collection.url,
    urlId: collection.urlId,
    name: collection.name,
    description: collection.description,
    sort: collection.sort,
    icon: collection.icon,
    index: collection.index,
    color: collection.color || "#4E5C6E",
    permission: collection.permission,
    sharing: collection.sharing,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    deletedAt: collection.deletedAt,
    documents: collection.documentStructure || [],
  };

  // Handle the "sort" field being empty here for backwards compatability
  if (!data.sort) {
    data.sort = {
      field: "title",
      direction: "asc",
    };
  }

  // "index" field is manually sorted and is represented by the documentStructure
  // already saved in the database, no further sort is needed
  if (data.sort.field !== "index") {
    data.documents = sortDocuments(collection.documentStructure, data.sort);
  }

  return data;
}
