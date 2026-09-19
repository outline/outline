import type { Node as ProsemirrorNode } from "prosemirror-model";
import { NodeSelection } from "prosemirror-state";
import type { EditorState } from "prosemirror-state";

/**
 * Determines whether an attachment node represents a PDF file. Falls back to the
 * filename extension when the contentType attribute is missing, which is the
 * case for attachments uploaded before PDF previews were introduced.
 *
 * @param node The attachment node to check.
 * @returns true if the attachment is a PDF.
 */
export function isPDFAttachment(node: ProsemirrorNode): boolean {
  if (node.attrs.contentType) {
    return node.attrs.contentType === "application/pdf";
  }

  return /\.pdf$/i.test(node.attrs.title ?? "");
}

/**
 * Determines whether the current selection is a PDF attachment.
 *
 * @param state The editor state.
 * @returns true if a PDF attachment is selected.
 */
export function isPDFAttachmentActive(state: EditorState): boolean {
  const { selection } = state;
  return (
    selection instanceof NodeSelection &&
    selection.node.type === state.schema.nodes.attachment &&
    isPDFAttachment(selection.node)
  );
}
