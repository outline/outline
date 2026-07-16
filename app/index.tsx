// oxlint-disable-next-line import/no-unresolved
import "vite/modulepreload-polyfill";
import { configure as configureMobx } from "mobx";
import { StrictMode } from "react";
import { render } from "react-dom";
import { RouterProvider } from "react-router-dom";
import env from "~/env";
import { initI18n } from "~/utils/i18n";
import { router } from "./routes/router";
import Logger from "./utils/Logger";
import { PluginManager } from "./utils/PluginManager";
import { initSentry } from "./utils/sentry";

// Load plugins as soon as possible
void PluginManager.loadPlugins();

initI18n(env.DEFAULT_LANGUAGE);
const element = window.document.getElementById("root");

if (env.SENTRY_DSN) {
  initSentry();
}

configureMobx({
  // TODO: Enable these options and fix any resulting warnings
  // enforceActions: env.isDevelopment ? "always" : "never",
  computedRequiresReaction: true,
  isolateGlobalState: true,
});

if (element) {
  render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
    element
  );
}

window.addEventListener("load", async () => {
  // installation does not use Google Analytics, or tracking is blocked on client
  // no point loading the rest of the analytics bundles
  if (!env.GOOGLE_ANALYTICS_ID || !window.ga) {
    return;
  }
  await import("~/utils/autotrack");
  window.ga("require", "outboundLinkTracker");
  window.ga("require", "urlChangeTracker");
  window.ga("require", "eventTracker", {
    attributePrefix: "data-",
  });
});

if ("serviceWorker" in navigator && env.ENVIRONMENT !== "development") {
  window.addEventListener("load", () => {
    // see: https://bugs.chromium.org/p/chromium/issues/detail?id=1097616
    // In some rare (<0.1% of cases) this call can return `undefined`
    const maybePromise = navigator.serviceWorker.register("/static/sw.js", {
      scope: "/",
    });

    if (maybePromise?.then) {
      maybePromise
        .then((registration) => {
          Logger.debug(
            "lifecycle",
            "[ServiceWorker] Registered.",
            registration
          );
        })
        .catch((registrationError) => {
          Logger.debug(
            "lifecycle",
            "[ServiceWorker] Registration failed.",
            registrationError
          );
        });
    }
  });
}
