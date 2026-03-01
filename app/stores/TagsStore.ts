import invariant from "invariant";
import { action, computed, runInAction } from "mobx";
import Tag from "~/models/Tag";
import type { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import type RootStore from "./RootStore";
import Store from "./base/Store";

type TagUsageEntry = {
	id: string;
	name: string;
	documentCount: number;
};

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
	 * Fetch usage statistics (document count per tag) for the current team.
	 *
	 * @returns An array of Tag models with `documentCount` populated.
	 */
	@action
	fetchUsage = async (): Promise<Tag[]> => {
		this.isFetching = true;

		try {
			const res = await client.post("/tags.usage");
			invariant(res?.data, "Data not available");

			return runInAction("TagsStore#fetchUsage", () => {
				return res.data.tags.map((entry: TagUsageEntry) => {
					const existing = this.get(entry.id);
					if (existing) {
						existing.documentCount = entry.documentCount;
						if ("color" in entry) {
							existing.color = (entry as TagUsageEntry & { color: string | null }).color;
						}
						return existing;
					}
					const tag = this.add(entry);
					tag.documentCount = entry.documentCount;
					return tag;
				});
			});
		} finally {
			this.isFetching = false;
		}
	};

	/**
	 * Add a tag to a document and update the document model in-store.
	 *
	 * @param documentId The document ID.
	 * @param tagId The tag ID.
	 */
	@action
	addToDocument = async (documentId: string, tagId: string): Promise<void> => {
		await client.post("/documents.addTag", { id: documentId, tagId });
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
		await client.post("/documents.removeTag", { id: documentId, tagId });
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
	 * Returns all tags sorted alphabetically by name.
	 */
	@computed
	get orderedData(): Tag[] {
		return Array.from(this.data.values()).sort((a, b) =>
			a.name.localeCompare(b.name)
		);
	}
}
