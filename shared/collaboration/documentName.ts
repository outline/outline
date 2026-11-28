/** The parts of a collaborative document name. */
export interface DocumentNameParts {
  /** The ID of the document. */
  documentId: string;
  /** The generation of the document's collaborative state. */
  stateGeneration: number;
}

/**
 * Build the name of the collaboration room for a document. Each state
 * generation has its own room, so state from an earlier generation is never
 * merged into a later one.
 *
 * @param documentId the ID of the document.
 * @param stateGeneration the generation of the document's collaborative state.
 * @returns the name of the room.
 */
export function buildDocumentName(
  documentId: string,
  stateGeneration: number
): string {
  return stateGeneration > 0
    ? `document.${documentId}.${stateGeneration}`
    : `document.${documentId}`;
}

/**
 * Parse the name of a collaboration room for a document.
 *
 * @param name the name of the room.
 * @returns the parts of the name, or undefined if the name is not valid.
 */
export function parseDocumentName(name: string): DocumentNameParts | undefined {
  const [type, documentId, generation, ...rest] = name.split(".");
  if (type !== "document" || !documentId || rest.length) {
    return undefined;
  }

  const stateGeneration = generation === undefined ? 0 : Number(generation);
  if (
    !Number.isSafeInteger(stateGeneration) ||
    buildDocumentName(documentId, stateGeneration) !== name
  ) {
    return undefined;
  }

  return { documentId, stateGeneration };
}
