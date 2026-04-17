import type { Tag } from "@server/models";

/**
 * Formats a Tag model for API responses.
 *
 * @param tag - the tag model to present.
 * @param documentCount - optional document count for the tag.
 * @returns a plain object representation of the tag.
 */
export default function presentTag(tag: Tag, documentCount?: number) {
  return {
    id: tag.id,
    name: tag.name,
    teamId: tag.teamId,
    createdById: tag.createdById,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
    documentCount: documentCount ?? 0,
  };
}
