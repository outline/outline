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
 * Tracks the mutable state for a single diagram editing session. Callbacks
 * close over a session object so that concurrent or overlapping sessions
 * do not interfere with each other.
 */
interface DiagramSession {
  /** The current src used to locate the node in the document. Updated after each successful export. */
  nodeSrc: string;
}

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
        if (!dispatch) {
          return true;
        }

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
  private insertEmptyDiagram(
    state: EditorState,
    dispatch: (tr: ReturnType<EditorState["tr"]["insert"]>) => void
  ) {
    const type = this.editor.schema.nodes.image;
    const { tr } = state;
    const transaction = tr.insert(
      state.selection.from,
      type.create({
        src: "",
        source: ImageSource.DiagramsNet,
      })
    );
    dispatch(transaction);
  }

  /**
   * Opens the diagram editor for creating or editing a diagram.
   *
   * @param node - the selected image node, if any.
   */
  private openDiagramEditor(node?: Node) {
    const nodeSrc = node?.attrs.src ?? "";
    const sourceUrl = nodeSrc || EMPTY_DIAGRAM_IMAGE;

    // Create a per-session object. Async callbacks close over this object so
    // that a second editing session does not clobber the first session's state.
    const session: DiagramSession = { nodeSrc };

    // Clean up any existing client
    if (this.client) {
      this.client.close();
    }

    this.client = new DiagramsNetClient(
      (client) => this.onDiagramReady(client, sourceUrl),
      (base64Data) => this.onDiagramExported(base64Data, session)
    );

    this.client.open(this.getDiagramsNetUrl());
  }

  /**
   * Called when the diagram editor is ready to receive commands.
   *
   * @param client - the DiagramsNetClient that fired the ready event.
   * @param sourceUrl - the URL of the diagram to load, or the empty diagram constant.
   */
  private async onDiagramReady(client: DiagramsNetClient, sourceUrl: string) {
    let data: string;

    if (sourceUrl === EMPTY_DIAGRAM_IMAGE) {
      // For empty diagram, send full data URI
      data = `data:image/svg+xml;base64,${EMPTY_DIAGRAM_IMAGE}`;
    } else {
      // For existing diagrams, send the full data URI
      data = await FileHelper.urlToBase64(sourceUrl);
    }

    client.loadDiagram(data);
  }

  /**
   * Called when a diagram has been exported from the editor.
   *
   * @param base64Data - the exported diagram as base64 encoded SVG.
   * @param session - the editing session that produced this export.
   */
  private async onDiagramExported(base64Data: string, session: DiagramSession) {
    try {
      const file = FileHelper.base64ToFile(
        base64Data,
        "diagram.svg",
        "image/svg+xml"
      );

      const dimensions = await FileHelper.getImageDimensions(file);
      const uploadedUrl = await this.uploadDiagramFile(file);

      // Capture the src we need to search for *before* updating the session,
      // then update the document and the session atomically.
      const srcToFind = session.nodeSrc;
      this.updateDiagramInDocument(uploadedUrl, dimensions || {}, srcToFind);

      // Update session so that subsequent saves within the same editing session
      // can locate the node by its new uploaded URL.
      session.nodeSrc = uploadedUrl;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to export diagram:", error);
    }
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
   * Updates or inserts the diagram image in the document. Always reads fresh
   * editor state at call-time so that positions are accurate even after async
   * gaps.
   *
   * @param uploadedUrl - the URL of the uploaded diagram.
   * @param dimensions - the image dimensions.
   * @param srcToFind - the src attribute value to search for in the document.
   */
  private updateDiagramInDocument(
    uploadedUrl: string,
    dimensions: { width?: number; height?: number },
    srcToFind: string
  ) {
    // Read fresh state at the moment of dispatch to avoid stale positions.
    const { state } = this.editor.view;
    const { dispatch } = this.editor.view;
    const imageType = this.editor.schema.nodes.image;

    // Try to find and update the existing node by its current src attribute.
    const existingNode = this.findImageNodeBySrc(state, srcToFind);

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
    const uiTheme = this.editor.props.theme.isDark ? "dark" : "atlas";
    return (
      sanitizeUrl(
        integration?.settings?.diagrams?.url ?? "https://embed.diagrams.net/"
      ) + `?embed=1&ui=${uiTheme}&spin=1&modified=unsavedChanges&proto=json`
    );
  }

  private client: DiagramsNetClient;
}
