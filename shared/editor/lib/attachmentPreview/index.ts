import type { Node as ProsemirrorNode } from "prosemirror-model";
import { csvPreview } from "./csv";
import { pdfPreview } from "./pdf";
import type { AttachmentPreviewProvider } from "./types";
import { xlsxPreview } from "./xlsx";

export type {
  AttachmentPreviewProvider,
  AttachmentPreviewProps,
  PreviewDimensions,
} from "./types";

/**
 * All registered attachment preview providers. Providers are matched in order,
 * so any provider with a broad match should be added last. Only register a
 * provider once it can render its file type, since matching a node enables the
 * preview toggle and replaces the attachment widget when toggled.
 */
const attachmentPreviews: AttachmentPreviewProvider[] = [
  pdfPreview,
  csvPreview,
  xlsxPreview,
];

/**
 * Finds the preview provider that renders a given attachment node.
 *
 * @param node - the attachment node to find a provider for.
 * @returns the matching provider, or undefined when the file type has no preview.
 */
export function getAttachmentPreview(
  node: ProsemirrorNode
): AttachmentPreviewProvider | undefined {
  for (const provider of attachmentPreviews) {
    if (provider.match(node)) {
      return provider;
    }
  }

  return undefined;
}

export default attachmentPreviews;
