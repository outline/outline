import { Hour } from "@shared/utils/time";
import type Collection from "@server/models/Collection";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import type { APIContext } from "@server/types";
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
    url: collection.path,
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
    color: collection.color,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    archivedBy: undefined,
  };

  if (options.isPublic && !options.includeUpdatedAt) {
    delete res.updatedAt;
  }

  if (!options.isPublic) {
    res.index = collection.index;
    res.sharing = collection.sharing;
    res.commenting = collection.commenting;
    res.permission = collection.permission;
    res.deletedAt = collection.deletedAt;
    res.archivedAt = collection.archivedAt;
    res.archivedBy =
      collection.archivedBy && presentUser(collection.archivedBy);
    res.sourceMetadata = collection.sourceMetadata
      ? {
          externalId: collection.sourceMetadata.externalId,
          externalName: collection.sourceMetadata.externalName,
          createdByName: collection.sourceMetadata.createdByName,
        }
      : undefined;
  }

  return res;
}
