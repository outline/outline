import { setupApiMock } from "./apiMock";
import { setupWebsocketMock } from "./websocketMock";

/**
 * The environment the React app normally has injected by the server.
 *
 * Exported so it can be checked: a key missing from here does not fail
 * loudly, it surfaces as an unsubstituted `{{placeholder}}` in the page.
 */
export const MOCK_ENV: Record<string, unknown> = {
  APP_NAME: "Outline",
  ENVIRONMENT: "development",
  URL: typeof window === "undefined" ? "" : window.location.origin,
  COLLABORATION_URL:
    typeof window === "undefined" ? "" : `ws://${window.location.host}`,
  CDN_URL: "",
  DEFAULT_LANGUAGE: "en_US",
  MAX_UPLOAD_SIZE: 26214400,
  analytics: [],
};

export function initMocks(): void {
  if (typeof window === "undefined" || !import.meta.env.DEV) {
    return;
  }

  // Provide default window.env required by Outline React app (app/env.ts & Analytics.tsx)
  window.env = {
    ...MOCK_ENV,
    ...window.env,
  };

  setupApiMock();
  setupWebsocketMock();
  // oxlint-disable-next-line no-console
  console.log(
    "[Outline Mock] Window environment, API & WebSocket Mock System initialized successfully!"
  );
}
