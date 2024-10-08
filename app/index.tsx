// eslint-disable-next-line import/no-unresolved
import "vite/modulepreload-polyfill";
import { LazyMotion } from "framer-motion";
import { KBarProvider } from "kbar";
import { Provider } from "mobx-react";
import * as React from "react";
import { render } from "react-dom";
import { HelmetProvider } from "react-helmet-async";
import { Router } from "react-router-dom";
import stores from "~/stores";
import Analytics from "~/components/Analytics";
import Dialogs from "~/components/Dialogs";
import ErrorBoundary from "~/components/ErrorBoundary";
import PageTheme from "~/components/PageTheme";
import ScrollToTop from "~/components/ScrollToTop";
import Theme from "~/components/Theme";
import Toasts from "~/components/Toasts";
import env from "~/env";
import { initI18n } from "~/utils/i18n";
import Desktop from "./components/DesktopEventHandler";
import LazyPolyfill from "./components/LazyPolyfills";
import PageScroll from "./components/PageScroll";
import Routes from "./routes";
import Logger from "./utils/Logger";
import { PluginManager } from "./utils/PluginManager";
import history from "./utils/history";
import { initSentry } from "./utils/sentry";

// Load plugins as soon as possible
void PluginManager.loadPlugins();

initI18n(env.DEFAULT_LANGUAGE);
const element = window.document.getElementById("root");

if (env.SENTRY_DSN) {
  initSentry(history);
}

// Make sure to return the specific export containing the feature bundle.
const loadFeatures = () => import("./utils/motion").then((res) => res.default);

const commandBarOptions = {
  animations: {
    enterMs: 250,
    exitMs: 200,
  },
};

if (element) {
  const App = () => (
    <React.StrictMode>
      <HelmetProvider>
        <Provider {...stores}>
          <Analytics>
            <Theme>
              <ErrorBoundary showTitle>
                <KBarProvider actions={[]} options={commandBarOptions}>
                  <LazyPolyfill>
                    <LazyMotion features={loadFeatures}>
                      <Router history={history}>
                        <PageScroll>
                          <PageTheme />
                          <ScrollToTop>
                            <Routes />
                          </ScrollToTop>
                          <Toasts />
                          <Dialogs />
                          <Desktop />
                        </PageScroll>
                      </Router>
                    </LazyMotion>
                  </LazyPolyfill>
                </KBarProvider>
              </ErrorBoundary>
            </Theme>
          </Analytics>
        </Provider>
      </HelmetProvider>
    </React.StrictMode>
  );

  render(<App />, element);
}

window.addEventListener("load", async () => {
  // installation does not use Google Analytics, or tracking is blocked on client
  // no point loading the rest of the analytics bundles
  if (!env.GOOGLE_ANALYTICS_ID || !window.ga) {
    return;
  }
  // https://github.com/googleanalytics/autotrack/issues/137#issuecomment-305890099
  await import("autotrack/autotrack.js");
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
