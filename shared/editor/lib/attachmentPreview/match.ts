import type { Node as ProsemirrorNode } from "prosemirror-model";

/**
 * Builds a matcher for an attachment file type. Matching prefers the
 * contentType attribute and falls back to the file extension, which is needed
 * for attachments uploaded before contentType was recorded on the node.
 *
 * @param contentTypes - the content types handled by the provider.
 * @param extensions - the file extensions handled by the provider, without a leading dot.
 * @returns a function reporting whether a node is of this file type.
 */
export function matchesFileType(contentTypes: string[], extensions: string[]) {
  const extensionRegex = new RegExp(`\\.(${extensions.join("|")})$`, "i");

  return function match(node: ProsemirrorNode): boolean {
    if (node.attrs.contentType) {
      return contentTypes.includes(node.attrs.contentType);
    }

    return extensionRegex.test(node.attrs.title ?? "");
  };
}
