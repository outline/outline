import type { Database } from "@server/models";

export default function presentDatabase(database: Database) {
  return {
    id: database.id,
    name: database.name,
    icon: database.icon,
    color: database.color,
    dataSchema: database.dataSchema,
    views: database.views,
    collectionId: database.collectionId,
    createdAt: database.createdAt,
    updatedAt: database.updatedAt,
  };
}
