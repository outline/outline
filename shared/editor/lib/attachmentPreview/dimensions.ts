import type { PreviewDimensions } from "./types";

/**
 * Builds a dimension resolver for a preview with a fixed natural aspect ratio.
 * The resolver fills in whichever of width or height is missing, and falls back
 * to the natural size when neither is stored on the node.
 *
 * @param naturalWidth - the natural width of the preview.
 * @param naturalHeight - the natural height of the preview.
 * @returns a function resolving partial dimensions to complete ones.
 */
export function aspectRatioResolver(
  naturalWidth: number,
  naturalHeight: number
) {
  return function resolveDimensions(
    width?: number | null,
    height?: number | null
  ): PreviewDimensions {
    if (width && height) {
      return { width, height };
    }

    if (width) {
      return {
        width,
        height: Math.round((width * naturalHeight) / naturalWidth),
      };
    }

    if (height) {
      return {
        width: Math.round((height * naturalWidth) / naturalHeight),
        height,
      };
    }

    return { width: naturalWidth, height: naturalHeight };
  };
}
