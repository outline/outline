import type { Tag } from "@server/models";

/**
 * Present a tag for API responses.
 *
 * @param tag the tag model to present.
 * @param options presentation options.
 * @returns a plain object representation of the tag.
 */
function presentTag(tag: Tag, options: { isPublic?: boolean } = {}) {
	const res: Record<string, unknown> = {
		name: tag.name,
	};

	if (!options.isPublic) {
		res.id = tag.id;
		res.teamId = tag.teamId;
		res.color = tag.color ?? null;
		res.documentCount = tag.documentCount;
		res.createdAt = tag.createdAt;
		res.updatedAt = tag.updatedAt;
	}

	return res;
}

export default presentTag;
