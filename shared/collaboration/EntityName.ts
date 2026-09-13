/**
 * The types of entity that support multiplayer editing, each type maps to a
 * namespace in the collaboration server.
 */
export enum MultiplayerEntityType {
  Document = "document",
  Collection = "collection",
}

/**
 * Builds the name of a multiplayer "document" as used by the collaboration
 * server to route connections to the correct entity.
 *
 * @param type The type of entity.
 * @param id The ID of the entity.
 * @returns the multiplayer document name.
 */
export function toMultiplayerName(
  type: MultiplayerEntityType,
  id: string
): string {
  return `${type}.${id}`;
}

/**
 * Parses a multiplayer "document" name into its entity type and ID.
 *
 * @param name The multiplayer document name, eg "document.123".
 * @returns the entity type and ID.
 */
export function parseMultiplayerName(name: string): {
  type: MultiplayerEntityType;
  id: string;
} {
  const [type, id] = name.split(".");
  return { type: type as MultiplayerEntityType, id };
}
