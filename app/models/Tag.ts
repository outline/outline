import { computed, observable } from "mobx";
import type TagsStore from "~/stores/TagsStore";
import Model from "./base/Model";
import Field from "./decorators/Field";

class Tag extends Model {
	static modelName = "Tag";

	store: TagsStore;

	/** The display name of the tag (normalised to lowercase). */
	@Field
	@observable
	name: string;

	/** The ID of the team this tag belongs to. */
	teamId: string;

	/** Optional hex color for the tag, e.g. "#FF5733". */
	@Field
	@observable
	color: string | null;

	/** Cached count of documents using this tag. */
	@Field
	@observable
	documentCount: number;

	/** Whether the current user has starred this tag. */
	@computed
	get isStarred(): boolean {
		return !!this.store.rootStore.stars.orderedData.find(
			(star) => star.tagId === this.id
		);
	}
}

export default Tag;
