export class RevisionHelper {
  /**
   * Get a static id for the latest revision of a note.
   *
   * @param documentId The document to generate an ID for.
   * @returns The ID of the latest revision of the note.
   */
  static latestId(noteId?: string) {
    return noteId ? `latest-${noteId}` : "";
  }
}
