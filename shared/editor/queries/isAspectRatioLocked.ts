import type { Node, NodeType } from "prosemirror-model";

/**
 * Returns whether nodes of the given type keep their aspect ratio until the
 * user changes it. Embeds start unlocked, other media start locked.
 *
 * @param type - the node type.
 * @returns true if the type is locked by default.
 */
export function isAspectRatioLockedByDefault(type: NodeType): boolean {
  return type.name !== "embed";
}

/**
 * Returns whether a node keeps its aspect ratio when resized. An unset
 * `lockAspectRatio` attribute means the default for the node type.
 *
 * @param node - the media node.
 * @returns true if the aspect ratio is locked.
 */
export function isAspectRatioLocked(node: Node): boolean {
  const value: unknown = node.attrs.lockAspectRatio;
  return typeof value === "boolean"
    ? value
    : isAspectRatioLockedByDefault(node.type);
}
