export class RevisionHelper {
  /**
   * Get a static id for the latest revision of a document.
   *
   * @param documentId The document to generate an ID for.
   * @returns The ID of the latest revision of the document.
   */
  static latestId(documentId?: string) {
    return documentId ? `latest-${documentId}` : "";
  }

  /**
   * Extract the document id from a latest revision id.
   *
   * @param id The revision id to inspect.
   * @returns The document id if the id is a latest revision id, otherwise undefined.
   */
  static documentIdFromLatestId(id: string) {
    return id.startsWith("latest-") ? id.slice("latest-".length) : undefined;
  }
}
