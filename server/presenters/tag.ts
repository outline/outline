import type Tag from "@server/models/Tag";

export default function presentTag(tag: Tag) {
  return {
    id: tag.id,
    name: tag.name,
    teamId: tag.teamId,
    createdById: tag.createdById,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
}
