import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { ComponentProps } from "../../types";

export interface PreviewDimensions {
  width: number;
  height: number;
}

export type AttachmentPreviewProps = ComponentProps & {
  /** Icon to display on the left side of the preview. */
  icon: React.ReactNode;
  /** Title of the preview, usually the file name. */
  title: React.ReactNode;
  /** Context, displayed to the right of the title. */
  context?: React.ReactNode;
  /** Callback triggered when the preview is resized. */
  onChangeSize?: (props: { width: number; height?: number }) => void;
};

/**
 * Describes how one file type is rendered as an inline preview inside an
 * attachment node. Register a provider per supported file type rather than
 * branching on file type inside the attachment node itself.
 */
export interface AttachmentPreviewProvider {
  /** A unique identifier for the preview type. */
  id: string;

  /** File extensions accepted by the file picker when replacing, eg ".pdf". */
  accept: string;

  /** A translated label describing the preview, shown in the selection toolbar. */
  label: () => string;

  /** An icon used to represent the preview in the selection toolbar. */
  icon: React.ReactNode;

  /** The component used to render the preview. */
  component: React.ComponentType<AttachmentPreviewProps>;

  /**
   * Determines whether this provider renders the given attachment node.
   *
   * @param node - the attachment node to check.
   * @returns true when this provider handles the node.
   */
  match: (node: ProsemirrorNode) => boolean;

  /**
   * Resolves complete preview dimensions from a possibly incomplete stored
   * width and height, using the natural aspect ratio of the file type.
   *
   * @param width - the stored preview width, if any.
   * @param height - the stored preview height, if any.
   * @returns the complete preview dimensions.
   */
  resolveDimensions: (
    width?: number | null,
    height?: number | null
  ) => PreviewDimensions;
}
