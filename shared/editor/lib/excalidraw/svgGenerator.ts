/**
 * Browser-side Excalidraw SVG generation
 * Uses Excalidraw's exportToSvg directly (no jsdom needed in browser)
 */
import { exportToSvg } from "@excalidraw/excalidraw";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type {
  ExcalidrawElement,
  NonDeleted,
} from "@excalidraw/excalidraw/element/types";

/**
 * Generate SVG from Excalidraw elements and appState with embedded scene data.
 * Browser version - works in the browser without jsdom.
 */
export async function generateExcalidrawSVG(
  elements: unknown[],
  appState: unknown,
  options: {
    exportPadding?: number;
    skipInliningFonts?: boolean;
  } = {}
): Promise<string> {
  const { exportPadding = 10, skipInliningFonts = true } = options;

  try {
    // Generate SVG using Excalidraw's exportToSvg utility
    // exportEmbedScene: true ensures the scene data is embedded in the SVG metadata
    const svgElement = await exportToSvg({
      elements: elements as readonly NonDeleted<ExcalidrawElement>[],
      appState: {
        exportBackground: true,
        exportWithDarkMode: false,
        ...(appState as Partial<Omit<AppState, "offsetTop" | "offsetLeft">>),
        exportEmbedScene: true, // MUST come AFTER spread to ensure it's not overridden
      },
      files: null as BinaryFiles | null,
      exportPadding,
      skipInliningFonts,
    });

    // Convert SVG element to string - no optimization
    const svgString = svgElement.outerHTML;

    // Verify scene data was embedded
    const hasPayload = svgString.includes('<!-- payload-start -->');
    console.log('[SVGGenerator] Generated SVG:', {
      length: svgString.length,
      hasPayload,
      elementCount: (elements as any[]).length,
    });

    if (!hasPayload) {
      console.warn('[SVGGenerator] WARNING: Scene data not embedded in SVG!');
    }

    return svgString;
  } catch (error) {
    throw new Error(
      `Failed to generate Excalidraw SVG: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
