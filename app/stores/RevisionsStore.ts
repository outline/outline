import { type JSONObject } from "@shared/types";
import type RootStore from "~/stores/RootStore";
import Store from "~/stores/base/Store";
import Revision from "~/models/Revision";
import { client } from "~/utils/ApiClient";

export default class RevisionsStore extends Store<Revision> {
  constructor(rootStore: RootStore) {
    super(rootStore, Revision);
  }

  /**
   * Fetches a single revision by ID, including its full document content.
   *
   * @param id - The ID of the revision to fetch.
   * @param options - Options to pass through to the underlying fetch.
   * @returns A promise that resolves to the fetched revision.
   */
  async fetch(id: string, options: JSONObject = {}): Promise<Revision> {
    const item = this.get(id);
    const force = Boolean(options.force) || (!!item && !item.data);
    return super.fetch(id, { ...options, force });
  }

  /**
   * Retrieves all revisions for a given document ID
   *
   * @param documentId - The ID of the document to retrieve revisions for
   * @returns An array of revisions for the specified document ID
   */
  getByDocumentId = (documentId: string): Revision[] =>
    this.orderedData.filter((revision) => revision.documentId === documentId);

  /**
   * Fetches the latest revision for the given document.
   *
   * @param documentId - the id of the document to fetch the latest revision for.
   * @returns A promise that resolves to the latest revision for the given document.
   */
  fetchLatest = async (documentId: string) => {
    const res = await client.post(`/revisions.info`, { documentId });
    return this.add(res.data);
  };
}
