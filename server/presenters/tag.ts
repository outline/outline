import type { Tag } from "@server/models";

/**
 * Formats a Tag model for API responses.
 *
 * @param tag - the tag model to present.
 * @returns a plain object representation of the tag.
 */
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
