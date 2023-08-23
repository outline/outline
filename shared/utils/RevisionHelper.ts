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
}
