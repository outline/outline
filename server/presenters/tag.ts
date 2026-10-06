import type { Tag } from "@server/models";

/**
 * Formats a Tag model for API responses.
 *
 * @param tag - the tag model to present.
 * @param documentCount - the number of documents the requesting user can read
 * that carry the tag. Omitted from the result when not given, since it
 * depends on the reader.
 * @returns a plain object representation of the tag.
 */
export default function presentTag(tag: Tag, documentCount?: number) {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    teamId: tag.teamId,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
    ...(documentCount !== undefined && { documentCount }),
  };
}

/**
 * Formats a Tag model for embedding in a document payload.
 *
 * @param tag - the tag model to present.
 * @returns the tag's id, name and color.
 */
export function presentDocumentTag(tag: Tag) {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
  };
}
