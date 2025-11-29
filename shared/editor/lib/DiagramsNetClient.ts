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
  /** Load a diagram from base64 encoded PNG with embedded XML. */
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
  /** Export format (e.g., "xmlpng"). */
  format?: string;
  /** Base64 encoded data. */
  data?: string;
  /** Base64 encoded PNG with embedded XML for loading. */
  xmlpng?: string;
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
   * Loads a diagram from a base64 encoded PNG with embedded XML.
   *
   * @param base64Png - base64 encoded PNG data containing the diagram.
   */
  loadDiagram = (base64Png: string) => {
    this.sendMessage({
      action: DiagramsNetAction.Load,
      xmlpng: base64Png,
    });
  };

  /**
   * Requests an export of the current diagram as a PNG with embedded XML.
   */
  exportDiagram = () => {
    this.sendMessage({
      action: DiagramsNetAction.Export,
      format: "xmlpng",
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

// Base64 encoded empty diagram image (1x1 transparent PNG with embedded diagrams.net metadata)
export const EMPTY_DIAGRAM_IMAGE =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAADz3RFWHRteGZpbGUAJTNDbXhmaWxlJTIwaG9zdCUzRCUyMmFwcC5kaWFncmFtcy5uZXQlMjIlMjBhZ2VudCUzRCUyMk1vemlsbGElMkY1LjAlMjAoTWFjaW50b3NoJTNCJTIwSW50ZWwlMjBNYWMlMjBPUyUyMFglMjAxMF8xNV83KSUyMEFwcGxlV2ViS2l0JTJGNTM3LjM2JTIwKEtIVE1MJTJDJTIwbGlrZSUyMEdlY2tvKSUyMENocm9tZSUyRjEzOS4wLjAuMCUyMFNhZmFyaSUyRjUzNy4zNiUyMiUyMHZlcnNpb24lM0QlMjIyOC4yLjglMjIlMjBzY2FsZSUzRCUyMjElMjIlMjBib3JkZXIlM0QlMjIwJTIyJTNFJTBBJTIwJTIwJTNDZGlhZ3JhbSUyMG5hbWUlM0QlMjJQYWdlLTElMjIlMjBpZCUzRCUyMloxN1hHdVRjUnQteXp1N2xJbm1ZJTIyJTNFJTBBJTIwJTIwJTIwJTIwJTNDbXhHcmFwaE1vZGVsJTIwZHglM0QlMjIxMjE2JTIyJTIwZHklM0QlMjI3NzIlMjIlMjBncmlkJTNEJTIyMSUyMiUyMGdyaWRTaXplJTNEJTIyMTAlMjIlMjBndWlkZXMlM0QlMjIxJTIyJTIwdG9vbHRpcHMlM0QlMjIxJTIyJTIwY29ubmVjdCUzRCUyMjElMjIlMjBhcnJvd3MlM0QlMjIxJTIyJTIwZm9sZCUzRCUyMjElMjIlMjBwYWdlJTNEJTIyMSUyMiUyMHBhZ2VTY2FsZSUzRCUyMjElMjIlMjBwYWdlV2lkdGglM0QlMjI4NTAlMjIlMjBwYWdlSGVpZ2h0JTNEJTIyMTEwMCUyMiUyMG1hdGglM0QlMjIwJTIyJTIwc2hhZG93JTNEJTIyMCUyMiUzRSUwQSUyMCUyMCUyMCUyMCUyMCUyMCUzQ3Jvb3QlM0UlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0NteENlbGwlMjBpZCUzRCUyMjAlMjIlMjAlMkYlM0UlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0NteENlbGwlMjBpZCUzRCUyMjElMjIlMjBwYXJlbnQlM0QlMjIwJTIyJTIwJTJGJTNFJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTNDJTJGcm9vdCUzRSUwQSUyMCUyMCUyMCUyMCUzQyUyRm14R3JhcGhNb2RlbCUzRSUwQSUyMCUyMCUzQyUyRmRpYWdyYW0lM0UlMEElM0MlMkZteGZpbGUlM0UlMEGDoGKLAAAADUlEQVR4AWJiYGRkAAAAAP//LRIDJAAAAAZJREFUAwAAFAAF3SeUTQAAAABJRU5ErkJggg==";
