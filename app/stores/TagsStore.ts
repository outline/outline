import invariant from "invariant";
import { action, computed, makeObservable, override, runInAction } from "mobx";
import Tag from "~/models/Tag";
import type { PartialExcept } from "~/types";
import { client } from "~/utils/ApiClient";
import type RootStore from "./RootStore";
import Store from "./base/Store";

/**
 * Store for managing workspace tags, including CRUD operations and
 * association of tags with documents.
 */
export default class TagsStore extends Store<Tag> {
  constructor(rootStore: RootStore) {
    super(rootStore, Tag);
    makeObservable(this);
  }

  /**
   * Retrieve a tag by its normalized name (O(1)).
   *
   * @param name - tag name, case-insensitive.
   * @returns matching Tag or undefined.
   */
  getByName(name: string): Tag | undefined {
    return this.nameMap.get(name.toLowerCase());
  }

  /**
   * Create or return an existing tag (upsert by name).
   *
   * @param name - the desired tag name.
   * @returns the created or existing Tag.
   */
  @action
  createTag = async (name: string): Promise<Tag> => {
    const res = await client.post("/tags.create", { name });
    invariant(res?.data, "Data not available");
    return runInAction(() => this.add(res.data));
  };

  /**
   * Add a tag to a document, and record it on the document once the request
   * succeeds.
   *
   * @param tagId - the tag id.
   * @param documentId - the document id.
   */
  @action
  addToDocument = async (tagId: string, documentId: string): Promise<void> => {
    await client.post("/tags.add", { tagId, documentId });
    const tag = this.get(tagId);
    if (tag) {
      this.attachToDocument(documentId, tag);
    }
  };

  /**
   * Remove a tag from a document. The tag is removed locally straight away
   * and put back in its original position if the request fails.
   *
   * @param tagId - the tag id.
   * @param documentId - the document id.
   */
  @action
  removeFromDocument = async (
    tagId: string,
    documentId: string
  ): Promise<void> => {
    const document = this.rootStore.documents.get(documentId);
    const index = document?.tagIds?.indexOf(tagId) ?? -1;
    this.detachFromDocument(documentId, tagId);

    try {
      await client.post("/tags.remove", { tagId, documentId });
    } catch (err) {
      runInAction(() => {
        if (
          index >= 0 &&
          document?.tagIds &&
          !document.tagIds.includes(tagId)
        ) {
          const tagIds = [...document.tagIds];
          tagIds.splice(index, 0, tagId);
          document.tagIds = tagIds;
        }
      });
      throw err;
    }
  };

  /**
   * Merge a tag into another: documents tagged with the source are tagged
   * with the target instead, and the source is deleted.
   *
   * @param sourceId - the id of the tag to merge away.
   * @param targetId - the id of the tag to keep.
   * @returns the target Tag.
   */
  @action
  merge = async (sourceId: string, targetId: string): Promise<Tag> => {
    const res = await client.post("/tags.merge", { sourceId, targetId });
    invariant(res?.data, "Data not available");
    return runInAction(() => {
      this.addPolicies(res.policies);
      this.applyMerge(res.data, sourceId);
      return this.get(res.data.id) as Tag;
    });
  };

  /**
   * Records locally that a tag was applied to a document, eg. from a realtime
   * event. Only documents whose tags are loaded are changed, and the tag is
   * only stored when it is already known or shown on such a document.
   *
   * @param documentId - the document id.
   * @param tag - the applied tag.
   */
  @action
  attachToDocument(documentId: string, tag: PartialExcept<Tag, "id">): void {
    const document = this.rootStore.documents.get(documentId);
    if (!document?.tagIds) {
      if (this.data.has(tag.id)) {
        this.add(tag);
      }
      return;
    }

    const model = this.add(tag);
    if (!document.tagIds.includes(model.id)) {
      document.tagIds = [...document.tagIds, model.id];
    }
  }

  /**
   * Records locally that a tag was removed from a document, eg. from a
   * realtime event.
   *
   * @param documentId - the document id.
   * @param tagId - the removed tag id.
   */
  @action
  detachFromDocument(documentId: string, tagId: string): void {
    const document = this.rootStore.documents.get(documentId);
    if (document?.tagIds?.includes(tagId)) {
      document.tagIds = document.tagIds.filter((id) => id !== tagId);
    }
  }

  /**
   * Records locally that a tag was merged into another, eg. from a realtime
   * event: every loaded document referencing the source tag is repointed to
   * the target instead (without duplicating an existing reference), the
   * source is removed from the store, and the target's latest attributes are
   * stored — the target may not have been loaded before the merge.
   *
   * @param tag - the target tag, with its up to date attributes.
   * @param sourceId - the id of the tag that was merged away.
   */
  @action
  applyMerge(tag: PartialExcept<Tag, "id">, sourceId: string): void {
    this.rootStore.documents.data.forEach((document) => {
      if (!document.tagIds?.includes(sourceId)) {
        return;
      }
      const withoutSource = document.tagIds.filter(
        (tagId) => tagId !== sourceId
      );
      document.tagIds = withoutSource.includes(tag.id)
        ? withoutSource
        : [...withoutSource, tag.id];
    });
    this.remove(sourceId);
    this.add(tag);
  }

  /**
   * Remove a tag from the store and from every loaded document.
   *
   * @param id - the tag id.
   */
  @override
  remove(id: string, options?: { permanent?: boolean }): void {
    super.remove(id, options);
    this.rootStore.documents.data.forEach((document) => {
      if (document.tagIds?.includes(id)) {
        document.tagIds = document.tagIds.filter((tagId) => tagId !== id);
      }
    });
  }

  /**
   * All tags sorted alphabetically by name.
   */
  @override
  override get orderedData(): Tag[] {
    return Array.from(this.data.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  // private

  /** Tags keyed by lowercased name, derived from the store data. */
  @computed
  private get nameMap(): Map<string, Tag> {
    return new Map(
      Array.from(this.data.values()).map((tag) => [tag.name.toLowerCase(), tag])
    );
  }
}
