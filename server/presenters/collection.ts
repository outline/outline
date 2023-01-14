import Collection from "@server/models/Collection";

export default function presentCollection(
  collection: Collection | null | undefined
) {
  if (!collection) {
    return undefined;
  }

  return {
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
}
