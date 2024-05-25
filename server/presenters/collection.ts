import { colorPalette } from "@shared/utils/collections";
import Collection from "@server/models/Collection";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";

export default async function presentCollection(collection: Collection) {
  return {
    id: collection.id,
    url: collection.url,
    urlId: collection.urlId,
    name: collection.name,
    data: await DocumentHelper.toJSON(collection),
    description: collection.description,
    sort: collection.sort,
    icon: collection.icon,
    index: collection.index,
    color: collection.color || colorPalette[0],
    permission: collection.permission,
    sharing: collection.sharing,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    deletedAt: collection.deletedAt,
  };
}
