import { Hour } from "@shared/utils/time";
import Collection from "@server/models/Collection";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { APIContext } from "@server/types";
import presentUser from "./user";

type Options = {
  /** Whether to render the collection's public fields. */
  isPublic?: boolean;
  /** The root share ID when presenting a shared collection. */
  shareId?: string;
  /** Whether to include the updatedAt timestamp. */
  includeUpdatedAt?: boolean;
};

export default async function presentCollection(
  ctx: APIContext | undefined,
  collection: Collection,
  options: Options = {}
) {
  const asData = !ctx || Number(ctx?.headers["x-api-version"] ?? 0) >= 3;

  const res: Record<string, any> = {
    id: collection.id,
    url: collection.url,
    urlId: collection.urlId,
    name: collection.name,
    data: asData
      ? await DocumentHelper.toJSON(
          collection,
          options.isPublic
            ? {
                signedUrls: Hour.seconds,
                teamId: collection.teamId,
                internalUrlBase: `/s/${options.shareId}`,
              }
            : undefined
        )
      : undefined,
    description: asData ? undefined : collection.description,
    sort: collection.sort,
    icon: collection.icon,
    index: collection.index,
    color: collection.color,
    permission: collection.permission,
    commenting: collection.commenting,
    sharing: collection.sharing,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    deletedAt: collection.deletedAt,
    archivedAt: collection.archivedAt,
    archivedBy: undefined,
  };

  if (options.isPublic && !options.includeUpdatedAt) {
    delete res.updatedAt;
  }

  if (!options.isPublic) {
    res.archivedBy =
      collection.archivedBy && presentUser(collection.archivedBy);
  }

  return res;
}
