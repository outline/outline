import type { Node as ProsemirrorNode } from "prosemirror-model";
import { NodeSelection } from "prosemirror-state";
import type { EditorState } from "prosemirror-state";
import { getAttachmentPreview } from "../lib/attachmentPreview";

/**
 * Determines whether an attachment node can be shown as an inline preview.
 * Preview support is resolved from the registered preview providers, which
 * match on the contentType attribute and fall back to the filename extension
 * for attachments uploaded before contentType was recorded.
 *
 * @param node The attachment node to check.
 * @returns true if the attachment has a preview provider.
 */
export function isPreviewableAttachment(node: ProsemirrorNode): boolean {
  return !getAttachmentPreview(node) ? false : true;
}

/**
 * Determines whether the current selection is an attachment that can be shown
 * as an inline preview.
 *
 * @param state The editor state.
 * @returns true if a previewable attachment is selected.
 */
export function isPreviewableAttachmentActive(state: EditorState): boolean {
  const { selection } = state;
  return (
    selection instanceof NodeSelection &&
    selection.node.type === state.schema.nodes.attachment &&
    isPreviewableAttachment(selection.node)
  );
}
