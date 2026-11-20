interface PDFDimensions {
  width: number;
  height: number;
}

/** The natural width of an embedded PDF preview. */
export const pdfNaturalWidth = 768;

/** The natural height of an embedded PDF preview. */
export const pdfNaturalHeight = 1086;

/**
 * Resolves missing PDF dimensions using the default preview aspect ratio.
 *
 * @param width - the stored preview width.
 * @param height - the stored preview height.
 * @returns the complete PDF preview dimensions.
 */
export function resolvePDFDimensions(
  width?: number | null,
  height?: number | null
): PDFDimensions {
  if (width && height) {
    return { width, height };
  }

  if (width) {
    return {
      width,
      height: Math.round((width * pdfNaturalHeight) / pdfNaturalWidth),
    };
  }

  if (height) {
    return {
      width: Math.round((height * pdfNaturalWidth) / pdfNaturalHeight),
      height,
    };
  }

  return {
    width: pdfNaturalWidth,
    height: pdfNaturalHeight,
  };
}

/**
 * Scales PDF preview dimensions to a new width and keeps their aspect ratio.
 *
 * @param dimensions - the current preview dimensions.
 * @param width - the new preview width.
 * @returns the scaled PDF preview dimensions.
 */
export function scalePDFDimensions(
  dimensions: PDFDimensions,
  width: number
): PDFDimensions {
  return {
    width,
    height: Math.round((width * dimensions.height) / dimensions.width),
  };
}
