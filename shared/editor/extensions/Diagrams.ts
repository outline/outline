import type { Command, EditorState } from "prosemirror-state";
import { NodeSelection } from "prosemirror-state";
import type { Node } from "prosemirror-model";
import type { CommandFactory } from "../lib/Extension";
import Extension from "../lib/Extension";
import FileHelper, { ImageSource } from "../lib/FileHelper";
import { IntegrationService } from "../../types";
import type { NodeWithPos } from "../types";
import {
  DiagramsNetClient,
  EMPTY_DIAGRAM_IMAGE,
} from "../lib/DiagramsNetClient";
import { sanitizeUrl } from "../../utils/urls";

/**
 * An editor extension that adds commands to insert and edit diagrams using diagrams.net.
 *
 * This extension provides a command to open the diagrams.net editor for creating
 * and editing diagrams. Diagrams are stored as SVG or PNG images with embedded XML data
 * that allows them to be re-edited later.
 */
export default class Diagrams extends Extension {
  get name() {
    return "diagrams";
  }

  commands(): Record<string, CommandFactory> {
    return {
      editDiagram: (): Command => (state, dispatch) => {
        const selectedNode = this.getSelectedImageNode(state);

        if (!selectedNode) {
          this.insertEmptyDiagram(state, dispatch);
        }

        this.openDiagramEditor(selectedNode);
        return true;
      },
    };
  }

  /**
   * Gets the currently selected image node if it exists.
   *
   * @param state - the editor state.
   * @returns the selected image node or undefined.
   */
  private getSelectedImageNode(state: EditorState) {
    if (state.selection instanceof NodeSelection) {
      const node = state.selection.node;
      if (node.type.name === "image") {
        return node;
      }
    }
    return;
  }

  /**
   * Inserts an empty diagram placeholder at the current cursor position.
   *
   * @param state - the editor state.
   * @param dispatch - the dispatch function.
   */
  private insertEmptyDiagram(state: EditorState, dispatch?: any) {
    const type = this.editor.schema.nodes.image;
    const { tr } = state;
    const transaction = tr.insert(
      state.selection.from,
      type.create({
        src: "",
        source: ImageSource.DiagramsNet,
      })
    );
    dispatch?.(transaction);
  }

  /**
   * Opens the diagram editor for creating or editing a diagram.
   *
   * @param node - the selected image node, if any.
   */
  private openDiagramEditor(node?: Node) {
    this.currentNodeSrc = node?.attrs.src ?? "";
    const sourceUrl = this.currentNodeSrc || EMPTY_DIAGRAM_IMAGE;

    // Clean up any existing client
    if (this.client) {
      this.client.close();
    }

    // Create new client with callbacks
    this.client = new DiagramsNetClient(
      () => this.onDiagramReady(sourceUrl),
      (base64Data) => this.onDiagramExported(base64Data)
    );

    this.client.open(this.getDiagramsNetUrl());
  }

  /**
   * Called when the diagram editor is ready to receive commands.
   *
   * @param sourceUrl - the URL of the diagram to load, or the empty diagram constant.
   */
  private async onDiagramReady(sourceUrl: string) {
    let data: string;

    if (sourceUrl === EMPTY_DIAGRAM_IMAGE) {
      // For empty diagram, send full data URI
      data = `data:image/svg+xml;base64,${EMPTY_DIAGRAM_IMAGE}`;
    } else {
      // For existing diagrams, send the full data URI
      data = await FileHelper.urlToBase64(sourceUrl);
    }

    this.client.loadDiagram(data);
  }

  /**
   * Called when a diagram has been exported from the editor.
   *
   * @param base64Data - the exported diagram as base64 encoded SVG.
   */
  private async onDiagramExported(base64Data: string) {
    const file = FileHelper.base64ToFile(
      base64Data,
      "diagram.svg",
      "image/svg+xml"
    );
    const dimensions = await FileHelper.getImageDimensions(file);
    const uploadedUrl = await this.uploadDiagramFile(file);

    this.updateDiagramInDocument(uploadedUrl, dimensions || {});
    this.currentNodeSrc = uploadedUrl;
  }

  /**
   * Uploads the diagram file using the editor's upload handler.
   *
   * @param file - the diagram file to upload.
   * @returns promise resolving to the uploaded file URL.
   * @throws Error if no upload handler is configured.
   */
  private async uploadDiagramFile(file: File): Promise<string> {
    const { uploadFile } = this.editor.props;
    if (!uploadFile) {
      throw new Error("No upload handler configured");
    }
    return uploadFile(file);
  }

  /**
   * Updates or inserts the diagram image in the document.
   *
   * @param uploadedUrl - the URL of the uploaded diagram.
   * @param dimensions - the image dimensions.
   */
  private updateDiagramInDocument(
    uploadedUrl: string,
    dimensions: { width?: number; height?: number }
  ) {
    const { state } = this.editor.view;
    const { dispatch } = this.editor.view;
    const imageType = this.editor.schema.nodes.image;

    // Try to find and update existing node
    const existingNode = this.findImageNodeBySrc(state, this.currentNodeSrc);

    const attrs = {
      ...dimensions,
      src: uploadedUrl,
      source: ImageSource.DiagramsNet,
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
   * Finds an image node in the document by its src attribute.
   *
   * @param state - the editor state.
   * @param src - the image source URL to search for.
   * @returns the node and its position, or undefined.
   */
  private findImageNodeBySrc(
    state: EditorState,
    src: string
  ): NodeWithPos | undefined {
    let foundNode: NodeWithPos | undefined;
    state.doc.descendants((node, pos) => {
      if (node.attrs.src === src && node.type.name === "image") {
        foundNode = { node, pos };
        return false; // Stop searching
      }
      return true;
    });
    return foundNode;
  }

  /**
   * Gets the configured diagrams.net URL or returns the default.
   *
   * @returns the diagrams.net editor URL.
   */
  private getDiagramsNetUrl(): string {
    const integration = this.editor.props.embeds?.find(
      (integ) => integ.name === IntegrationService.Diagrams
    );
    const uiTheme = this.editor.props.theme.isDark ? 'dark' : 'atlas';
    return (
      sanitizeUrl(
        integration?.settings?.diagrams?.url ?? "https://embed.diagrams.net/"
      ) + `?embed=1&ui=${uiTheme}&spin=1&modified=unsavedChanges&proto=json`
    );
  }

  private client: DiagramsNetClient;
  private currentNodeSrc: string = "";
}
