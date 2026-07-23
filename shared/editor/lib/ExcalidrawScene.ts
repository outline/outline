import type { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";

/**
 * The parsed contents of an Excalidraw scene.
 */
export type ExcalidrawScene = {
  elements: NonNullable<ExcalidrawInitialDataState["elements"]>;
  appState: NonNullable<ExcalidrawInitialDataState["appState"]>;
  files: NonNullable<ExcalidrawInitialDataState["files"]>;
};

/**
 * Exports an Excalidraw scene to an SVG string with the scene data embedded as
 * a comment payload, so the diagram can be re-edited later. Delegates all
 * encoding to the library's own `exportToSvg` (with `exportEmbedScene`) rather
 * than reproducing its payload format by hand.
 *
 * @param scene The scene to export.
 * @returns The serialized SVG string with the embedded scene.
 */
export async function sceneToSvgString(
  scene: ExcalidrawScene
): Promise<string> {
  const { exportToSvg } = await import("@excalidraw/excalidraw");
  const svg = await exportToSvg({
    elements: scene.elements,
    appState: { ...scene.appState, exportEmbedScene: true },
    files: scene.files ?? null,
  });
  return new XMLSerializer().serializeToString(svg);
}

/**
 * Extracts an Excalidraw scene embedded in an SVG file. Delegates decoding to
 * the library's own `loadFromBlob`, which understands the embedded payload
 * format across Excalidraw versions.
 *
 * @param file The SVG file containing an embedded scene.
 * @returns The parsed scene.
 */
export async function svgFileToScene(file: File): Promise<ExcalidrawScene> {
  const { loadFromBlob } = await import("@excalidraw/excalidraw");
  const restored = await loadFromBlob(file, null, null);
  return {
    elements: restored.elements,
    appState: restored.appState,
    files: restored.files ?? {},
  };
}
