/**
 * Events sent by diagrams.net to the parent window.
 */
export enum DiagramsNetEvent {
  /** Editor is ready to receive commands. */
  Init = "init",
  /** User clicked the save button. */
  Save = "save",
  /** Diagram has been exported. */
  Export = "export",
  /** Editor is closing. */
  Exit = "exit",
}

/**
 * Actions that can be sent to diagrams.net.
 */
export enum DiagramsNetAction {
  /** Load a diagram from base64 encoded data with embedded XML. */
  Load = "load",
  /** Export the current diagram. */
  Export = "export",
}

/**
 * Message format for communication with diagrams.net.
 */
export interface DiagramsNetMessage {
  /** Event type from diagrams.net. */
  event?: string;
  /** Action to perform in diagrams.net. */
  action?: string;
  /** Export format (e.g., "xmlsvg", "xmlpng"). */
  format?: string;
  /** Base64 encoded data for export responses. */
  data?: string;
  /** Data URI or base64 encoded image with embedded XML for loading. */
  xml?: string;
  /** Loading spinner key. */
  spinKey?: string;
}

/**
 * Handles communication with the diagrams.net editor window.
 *
 * This class manages the lifecycle of the diagrams.net popup window and
 * implements the message-passing protocol for loading and exporting diagrams.
 */
export class DiagramsNetClient {
  private window: Window | null = null;

  /**
   * Creates a new DiagramsNetClient instance.
   *
   * @param onDiagramReady - callback when the editor is ready to receive commands.
   * @param onDiagramExported - callback when a diagram has been exported.
   */
  constructor(
    private onDiagramReady: (client: DiagramsNetClient) => void,
    private onDiagramExported: (base64Data: string) => void
  ) {}

  /**
   * Opens the diagrams.net editor in a new window.
   *
   * @param url - the diagrams.net editor URL.
   */
  open(url: string): void {
    if (this.window) {
      this.close();
    }

    window.addEventListener("message", this.handleMessage);
    this.window = window.open(url);
  }

  /**
   * Closes the editor window and cleans up event listeners.
   */
  close(): void {
    window.removeEventListener("message", this.handleMessage);

    if (this.window) {
      this.window.close();
      this.window = null;
    }
  }

  /**
   * Loads a diagram from a data URI containing embedded XML.
   * Supports both PNG and SVG data URIs (e.g., "data:image/svg+xml;base64,...").
   *
   * @param dataUri - complete data URI with the diagram data.
   */
  loadDiagram = (dataUri: string) => {
    this.sendMessage({
      action: DiagramsNetAction.Load,
      xml: dataUri,
    });
  };

  /**
   * Requests an export of the current diagram as an SVG with embedded XML.
   */
  exportDiagram = () => {
    this.sendMessage({
      action: DiagramsNetAction.Export,
      format: "xmlsvg",
      spinKey: "saving",
    });
  };

  /**
   * Sends a message to the diagrams.net window.
   *
   * @param message - the message to send.
   * @throws Error if the window is not open.
   */
  private sendMessage = (message: DiagramsNetMessage) => {
    if (!this.window) {
      throw new Error("Diagrams.net window is not open");
    }
    this.window.postMessage(JSON.stringify(message), "*");
  };

  /**
   * Handles incoming messages from the diagrams.net window.
   *
   * @param event - the message event.
   */
  private handleMessage = (event: MessageEvent) => {
    if (!event.data.length || event.source !== this.window) {
      return;
    }

    const message = JSON.parse(event.data) as DiagramsNetMessage;

    switch (message.event) {
      case DiagramsNetEvent.Init:
        this.onDiagramReady(this);
        break;

      case DiagramsNetEvent.Save:
        this.exportDiagram();
        break;

      case DiagramsNetEvent.Export:
        if (message.data) {
          this.onDiagramExported(message.data);
        }
        break;

      case DiagramsNetEvent.Exit:
        this.close();
        break;
    }
  };
}

/**
 * Base64 encoded empty diagram image (minimal SVG with embedded diagrams.net metadata).
 * The mxfile XML is embedded in the content attribute of the SVG.
 */
export const EMPTY_DIAGRAM_IMAGE =
  "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHdpZHRoPSIxcHgiIGhlaWdodD0iMXB4IiB2aWV3Qm94PSItMC41IC0wLjUgMSAxIiBjb250ZW50PSIlM0NteGZpbGUlMjBob3N0JTNEJTIyYXBwLmRpYWdyYW1zLm5ldCUyMiUyMHNjYWxlJTNEJTIyMSUyMiUyMGJvcmRlciUzRCUyMjAlMjIlM0UlM0NkaWFncmFtJTIwbmFtZSUzRCUyMlBhZ2UtMSUyMiUyMGlkJTNEJTIyZW1wdHklMjIlM0UlM0NteEdyYXBoTW9kZWwlMjBkeCUzRCUyMjEwMDAlMjIlMjBkeSUzRCUyMjEwMDAlMjIlMjBncmlkJTNEJTIyMSUyMiUyMGdyaWRTaXplJTNEJTIyMTAlMjIlMjBndWlkZXMlM0QlMjIxJTIyJTIwdG9vbHRpcHMlM0QlMjIxJTIyJTIwY29ubmVjdCUzRCUyMjElMjIlMjBhcnJvd3MlM0QlMjIxJTIyJTIwZm9sZCUzRCUyMjElMjIlMjBwYWdlJTNEJTIyMSUyMiUyMHBhZ2VTY2FsZSUzRCUyMjElMjIlMjBwYWdlV2lkdGglM0QlMjI4NTAlMjIlMjBwYWdlSGVpZ2h0JTNEJTIyMTEwMCUyMiUyMG1hdGglM0QlMjIwJTIyJTIwc2hhZG93JTNEJTIyMCUyMiUzRSUzQ3Jvb3QlM0UlM0NteENlbGwlMjBpZCUzRCUyMjAlMjIlMkYlM0UlM0NteENlbGwlMjBpZCUzRCUyMjElMjIlMjBwYXJlbnQlM0QlMjIwJTIyJTJGJTNFJTNDJTJGcm9vdCUzRSUzQyUyRm14R3JhcGhNb2RlbCUzRSUzQyUyRmRpYWdyYW0lM0UlM0MlMkZteGZpbGUlM0UiLz4=";
