import type RootStore from "~/stores/RootStore";
import Store from "~/stores/base/Store";
import Revision from "~/models/Revision";
import { client } from "~/utils/ApiClient";

export default class RevisionsStore extends Store<Revision> {
  constructor(rootStore: RootStore) {
    super(rootStore, Revision);
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
