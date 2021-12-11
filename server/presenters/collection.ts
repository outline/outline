import { sortNavigationNodes } from "@shared/utils/collections";
import { Collection } from "@server/models";

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

  data.documents = sortNavigationNodes(collection.documentStructure, data.sort);

  return data;
}
