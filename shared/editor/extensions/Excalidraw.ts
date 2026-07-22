import type { Command, EditorState } from "prosemirror-state";
import { NodeSelection } from "prosemirror-state";
import type { Node } from "prosemirror-model";
import { v4 as uuidv4 } from "uuid";
import type { CommandFactory } from "../lib/Extension";
import Extension from "../lib/Extension";
import FileHelper, { ImageSource } from "../lib/FileHelper";
import type { NodeWithPos } from "../types";
import type { ExcalidrawScene } from "../lib/ExcalidrawScene";
import { sceneToSvgString } from "../lib/ExcalidrawScene";

/**
 * Event emitted on the editor's event bus when an Excalidraw diagram should be
 * opened for editing. The UI layer (see app/editor) listens for this and mounts
 * the Excalidraw modal.
 */
export const ExcalidrawOpenEvent = "excalidraw:open";

/**
 * The payload passed to a `excalidraw:open` event. `src` is the current image
 * src, used both to load the existing scene and to locate the node again when
 * the export completes (the src changes after each save).
 */
export type ExcalidrawOpenPayload = {
  /** A stable identifier used to find this node after async editor work. */
  id?: string;
  /** The current src of the node being edited, or "" for a new diagram. */
  src: string;
  /** Called by the UI when the user saves; persists the scene and closes. */
  onSave: (scene: ExcalidrawScene) => Promise<void>;
};

/**
 * An editor extension that adds a command to insert and edit diagrams using
 * Excalidraw. Diagrams are stored as SVG images with the Excalidraw scene
 * embedded in the SVG, so they can be re-edited later. Unlike diagrams.net,
 * Excalidraw is bundled as a React component and rendered in a modal owned by
 * the UI layer — this extension only manages the document mutations and
 * upload, and signals the UI to open via the editor event bus.
 */
export default class Excalidraw extends Extension {
  get name() {
    return "excalidraw";
  }

  commands(): Record<string, CommandFactory> {
    return {
      editExcalidraw: (): Command => (state, dispatch) => {
        if (!dispatch) {
          return true;
        }

        let selectedNode = this.getSelectedImageNode(state);

        if (!selectedNode) {
          this.insertEmptyDiagram(state, dispatch);
          // Re-read state after insert so the newly inserted node is selected.
          selectedNode = this.getSelectedImageNode(this.editor.view.state);
        }

        this.openEditor(selectedNode?.attrs.id, selectedNode?.attrs.src ?? "");
        return true;
      },
    };
  }

  /**
   * Gets the currently selected Excalidraw image node if it exists.
   */
  private getSelectedImageNode(state: EditorState) {
    if (state.selection instanceof NodeSelection) {
      const node = state.selection.node;
      if (
        node.type.name === "image" &&
        node.attrs.source === ImageSource.Excalidraw
      ) {
        return node;
      }
    }
    return;
  }

  /**
   * Inserts an empty Excalidraw diagram placeholder at the cursor and selects
   * it, so subsequent saves update this node.
   */
  private insertEmptyDiagram(
    state: EditorState,
    dispatch: (tr: ReturnType<EditorState["tr"]["insert"]>) => void
  ) {
    const type = this.editor.schema.nodes.image;
    const { tr } = state;
    const pos = state.selection.from;
    tr.insert(
      pos,
      type.create({
        id: uuidv4(),
        src: "",
        source: ImageSource.Excalidraw,
      })
    );
    tr.setSelection(NodeSelection.create(tr.doc, pos));
    dispatch(tr);
  }

  /**
   * Signals the UI layer to open the Excalidraw editor modal for the node with
   * the given src. The UI calls back into `onSave` when the user saves.
   *
   * @param id Stable identity of the image node being edited.
   * @param src The current src of the node being edited, or "" for a new one.
   */
  private openEditor(id: string | undefined, src: string) {
    const payload: ExcalidrawOpenPayload = {
      id,
      src,
      onSave: (scene) => this.saveScene(scene, { id, src }),
    };
    this.editor.events.emit(ExcalidrawOpenEvent, payload);
  }

  /**
   * Exports the scene to an SVG with embedded data, uploads it, and updates the
   * node in the document. Mirrors the diagrams.net upload/update flow.
   *
   * @param scene The scene exported from the editor.
   * @param locator Stable node id and current src used to find the node.
   */
  private async saveScene(
    scene: ExcalidrawScene,
    locator: { id?: string; src: string }
  ) {
    const svgString = await sceneToSvgString(scene);
    const file = new File([svgString], "diagram.svg", {
      type: "image/svg+xml",
    });

    const dimensions = await FileHelper.getImageDimensions(file);
    const uploadedUrl = await this.uploadFile(file);

    this.updateDiagramInDocument(uploadedUrl, dimensions || {}, locator);
  }

  private async uploadFile(file: File): Promise<string> {
    const { uploadFile } = this.editor.props;
    if (!uploadFile) {
      throw new Error("No upload handler configured");
    }
    return uploadFile(file);
  }

  /**
   * Updates or inserts the diagram image in the document. Reads fresh editor
   * state at call-time so positions are accurate after async gaps.
   */
  private updateDiagramInDocument(
    uploadedUrl: string,
    dimensions: { width?: number; height?: number },
    locator: { id?: string; src: string }
  ) {
    const { state } = this.editor.view;
    const { dispatch } = this.editor.view;
    const imageType = this.editor.schema.nodes.image;

    const existingNode = this.findImageNode(state, locator);

    const attrs = {
      ...dimensions,
      id: locator.id ?? uuidv4(),
      src: uploadedUrl,
      source: ImageSource.Excalidraw,
    };

    if (existingNode) {
      dispatch(
        state.tr.setNodeMarkup(existingNode.pos, undefined, {
          ...existingNode.node.attrs,
          ...attrs,
        })
      );
    } else {
      const imageNode = imageType.create(attrs);
      const transaction = state.tr.insert(state.selection.from, imageNode);
      dispatch(transaction);
    }
  }

  /**
   * Finds an Excalidraw image node by stable id, falling back to its src for
   * diagrams that entered through a Markdown/API round-trip without an id.
   */
  private findImageNode(
    state: EditorState,
    locator: { id?: string; src: string }
  ): NodeWithPos | undefined {
    let foundNode: NodeWithPos | undefined;
    state.doc.descendants((node: Node, pos: number) => {
      if (
        ((locator.id && node.attrs.id === locator.id) ||
          (!locator.id && node.attrs.src === locator.src)) &&
        node.type.name === "image" &&
        node.attrs.source === ImageSource.Excalidraw
      ) {
        foundNode = { node, pos };
        return false;
      }
      return true;
    });
    return foundNode;
  }
}
