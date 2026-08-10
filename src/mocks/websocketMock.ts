export function setupWebsocketMock(): void {
  if (typeof window === "undefined") {
    return;
  }

  class DummyWebSocket extends EventTarget {
    public url: string;
    public readyState: number = 1; // OPEN
    public static readonly CONNECTING = 0;
    public static readonly OPEN = 1;
    public static readonly CLOSING = 2;
    public static readonly CLOSED = 3;

    public onopen: ((event: Event) => void) | null = null;
    public onclose: ((event: CloseEvent) => void) | null = null;
    public onerror: ((event: Event) => void) | null = null;
    public onmessage: ((event: MessageEvent) => void) | null = null;

    constructor(url: string) {
      super();
      this.url = url;
      setTimeout(() => {
        const openEvent = new Event("open");
        this.dispatchEvent(openEvent);
        if (this.onopen) {
          this.onopen(openEvent);
        }
      }, 50);
    }

    public send(
      _data: string | ArrayBufferLike | Blob | ArrayBufferView
    ): void {
      // Mock sending data silently
    }

    public close(): void {
      this.readyState = 3; // CLOSED
      const closeEvent = new CloseEvent("close");
      this.dispatchEvent(closeEvent);
      if (this.onclose) {
        this.onclose(closeEvent);
      }
    }
  }

  // Intercept the WebSocket constructor. The dummy implements only the parts
  // the client touches, so it is widened through `unknown` rather than
  // pretending to satisfy the full DOM interface.
  window.WebSocket = DummyWebSocket as unknown as typeof WebSocket;
}
