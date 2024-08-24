import Collection from "@server/models/Collection";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { APIContext } from "@server/types";

export default async function presentCollection(
  ctx: APIContext | undefined,
  collection: Collection
) {
  const asData = !ctx || Number(ctx?.headers["x-api-version"] ?? 0) >= 3;

  return {
    id: collection.id,
    url: collection.url,
    urlId: collection.urlId,
    name: collection.name,
    data: asData ? await DocumentHelper.toJSON(collection) : undefined,
    description: asData ? undefined : collection.description,
    sort: collection.sort,
    icon: collection.icon,
    index: collection.index,
    color: collection.color,
    permission: collection.permission,
    sharing: collection.sharing,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    deletedAt: collection.deletedAt,
  };
}
