import { setupApiMock } from "./apiMock";
import { setupWebsocketMock } from "./websocketMock";

export function initMocks(): void {
  if (typeof window !== "undefined") {
    setupApiMock();
    setupWebsocketMock();
    // oxlint-disable-next-line no-console
    console.log("[Outline Mock] API & WebSocket Mock System initialized successfully!");
  }
}
