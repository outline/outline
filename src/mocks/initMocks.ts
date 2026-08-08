import { setupApiMock } from "./apiMock";
import { setupWebsocketMock } from "./websocketMock";

export function initMocks(): void {
  if (typeof window !== "undefined") {
    // Provide default window.env required by Outline React app (app/env.ts)
    window.env = {
      ENVIRONMENT: "development",
      URL: window.location.origin,
      COLLABORATION_URL: `ws://${window.location.host}`,
      CDN_URL: "",
      DEFAULT_LANGUAGE: "en_US",
      MAX_UPLOAD_SIZE: 26214400,
      ...window.env,
    };

    setupApiMock();
    setupWebsocketMock();
    // oxlint-disable-next-line no-console
    console.log("[Outline Mock] Window environment, API & WebSocket Mock System initialized successfully!");
  }
}
