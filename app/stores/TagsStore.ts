import invariant from "invariant";
import { action, computed, runInAction } from "mobx";
import Tag from "~/models/Tag";
import type { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import type RootStore from "./RootStore";
import Store from "./base/Store";

export default class TagsStore extends Store<Tag> {
	constructor(rootStore: RootStore) {
		super(rootStore, Tag);
	}

	/**
	 * Fetch a paginated list of tags for the current team.
	 *
	 * @param params Optional pagination parameters.
	 * @returns An array of Tag models.
	 */
	@action
	fetchPage = async (params?: PaginationParams): Promise<Tag[]> => {
		this.isFetching = true;

		try {
			const res = await client.post("/tags.list", params);
			invariant(res?.data, "Data not available");

			return runInAction("TagsStore#fetchPage", () => {
				const models = (res.data as Tag[]).map(this.add);
				this.addPolicies(res.policies);
				this.isLoaded = true;
				return models;
			});
		} finally {
			this.isFetching = false;
		}
	};

	/**
	 * Fetch tags with usage statistics (documentCount) for the current team.
	 * documentCount is now a cached field on the Tag model, so this is equivalent to fetchPage.
	 *
	 * @returns An array of Tag models with `documentCount` populated.
	 */
	fetchUsage = (): Promise<Tag[]> => this.fetchPage();

	/**
	 * Add a tag to a document and update the document model in-store.
	 *
	 * @param documentId The document ID.
	 * @param tagId The tag ID.
	 */
	@action
	addToDocument = async (documentId: string, tagId: string): Promise<void> => {
		await client.post("/documents.add_tag", { id: documentId, tagId });
		const document = this.rootStore.documents.get(documentId);
		if (document) {
			const tag = this.get(tagId);
			if (tag && document.tags) {
				runInAction("TagsStore#addToDocument", () => {
					if (!document.tags!.find((t) => t.id === tagId)) {
						document.tags = [
							...document.tags!,
							{ id: tagId, name: tag.name, color: tag.color ?? null },
						];
					}
				});
			}
		}
	};

	/**
	 * Remove a tag from a document and update the document model in-store.
	 *
	 * @param documentId The document ID.
	 * @param tagId The tag ID.
	 */
	@action
	removeFromDocument = async (
		documentId: string,
		tagId: string
	): Promise<void> => {
		await client.post("/documents.remove_tag", { id: documentId, tagId });
		const document = this.rootStore.documents.get(documentId);
		if (document?.tags) {
			runInAction("TagsStore#removeFromDocument", () => {
				document.tags = document.tags!.filter(
					(t: { id: string }) => t.id !== tagId
				);
			});
		}
	};

	/**
	 * Star a tag for the current user.
	 *
	 * @param tag The tag to star.
	 * @param index Optional fractional index for sidebar ordering.
	 */
	star = async (tag: Tag, index?: string): Promise<void> => {
		await this.rootStore.stars.create({
			tagId: tag.id,
			index,
		});
	};

	/**
	 * Unstar a tag for the current user.
	 *
	 * @param tag The tag to unstar.
	 */
	unstar = async (tag: Tag): Promise<void> => {
		const star = this.rootStore.stars.orderedData.find(
			(s) => s.tagId === tag.id
		);
		await star?.delete();
	};

	/**
	 * Returns all tags sorted alphabetically by name.
	 */
	@computed
	get orderedData(): Tag[] {
		return Array.from(this.data.values()).sort((a, b) =>
			a.name.localeCompare(b.name)
		);
	}
}
