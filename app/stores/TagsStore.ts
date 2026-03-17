import invariant from "invariant";
import { action, runInAction, computed, observable } from "mobx";
import Tag from "~/models/Tag";
import type { PaginationParams } from "~/types";
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
    // Capture the parent's arrow-function `add` (set on the instance by the
    // base class constructor) before we shadow it with our own override below.
    const parentAdd = this.add;

    /**
     * Override to keep the name cache in sync.
     *
     * @param item - partial tag data.
     * @returns the stored Tag model.
     */
    this.add = (item: Parameters<Store<Tag>["add"]>[0]): Tag => {
      const tag = parentAdd(item);
      if (tag.name) {
        this.nameMap.set(tag.name.toLowerCase(), tag);
      }
      return tag;
    };
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
   * Fetch a page of workspace tags.
   *
   * @param params - optional pagination params.
   * @returns array of Tag models.
   */
  @action
  override fetchPage = async (params?: PaginationParams): Promise<Tag[]> => {
    this.isFetching = true;
    try {
      const res = await client.post("/tags.list", params);
      invariant(res?.data, "Data not available");
      return runInAction("TagsStore#fetchPage", () => {
        const models = res.data.map(this.add);
        this.addPolicies(res.policies);
        this.isLoaded = true;
        return models;
      });
    } finally {
      this.isFetching = false;
    }
  };

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
    return runInAction("TagsStore#createTag", () => this.add(res.data));
  };

  /**
   * Add a tag to a document.
   *
   * @param tagId - the tag id.
   * @param documentId - the document id.
   */
  @action
  addToDocument = async (tagId: string, documentId: string): Promise<void> => {
    await client.post("/tags.add", { tagId, documentId });
  };

  /**
   * Remove a tag from a document.
   *
   * @param tagId - the tag id.
   * @param documentId - the document id.
   */
  @action
  removeFromDocument = async (
    tagId: string,
    documentId: string
  ): Promise<void> => {
    await client.post("/tags.remove", { tagId, documentId });
  };

  /**
   * All tags sorted alphabetically by name.
   */
  @computed
  override get orderedData(): Tag[] {
    return Array.from(this.data.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  /**
   * Clear all tags and the name cache.
   */
  override clear() {
    super.clear();
    this.nameMap.clear();
  }

  // private

  @observable
  private nameMap = new Map<string, Tag>();
}
