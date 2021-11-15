import "focus-visible";
import { LazyMotion } from "framer-motion";
import { KBarProvider } from "kbar";
import { Provider } from "mobx-react";
import * as React from "react";
import { render } from "react-dom";
import { Router } from "react-router-dom";
import { initI18n } from "shared/i18n";
import stores from "stores";
import Analytics from "components/Analytics";
import { CommandBarOptions } from "components/CommandBar";
import Dialogs from "components/Dialogs";
import ErrorBoundary from "components/ErrorBoundary";
import PageTheme from "components/PageTheme";
import ScrollToTop from "components/ScrollToTop";
import Theme from "components/Theme";
import Toasts from "components/Toasts";
import Routes from "./routes";
import history from "./utils/history";
import { initSentry } from "./utils/sentry";
import env from "env";

initI18n();
const element = window.document.getElementById("root");

if (env.SENTRY_DSN) {
  initSentry(history);
}

if ("serviceWorker" in window.navigator) {
  window.addEventListener("load", () => {
    // see: https://bugs.chromium.org/p/chromium/issues/detail?id=1097616
    // In some rare (<0.1% of cases) this call can return `undefined`
    const maybePromise = window.navigator.serviceWorker.register(
      "/static/service-worker.js",
      {
        scope: "/",
      }
    );

    if (maybePromise && maybePromise.then) {
      maybePromise
        .then((registration) => {
          console.log("SW registered: ", registration);
        })
        .catch((registrationError) => {
          console.log("SW registration failed: ", registrationError);
        });
    }
  });
}

// Make sure to return the specific export containing the feature bundle.
const loadFeatures = () => import("./utils/motion").then((res) => res.default);

if (element) {
  const App = () => (
    <React.StrictMode>
      <Provider {...stores}>
        <Analytics>
          <Theme>
            <ErrorBoundary>
              <KBarProvider actions={[]} options={CommandBarOptions}>
                <LazyMotion features={loadFeatures}>
                  <Router history={history}>
                    <>
                      <PageTheme />
                      <ScrollToTop>
                        <Routes />
                      </ScrollToTop>
                      <Toasts />
                      <Dialogs />
                    </>
                  </Router>
                </LazyMotion>
              </KBarProvider>
            </ErrorBoundary>
          </Theme>
        </Analytics>
      </Provider>
    </React.StrictMode>
  );

  render(<App />, element);
}

window.addEventListener("load", async () => {
  // installation does not use Google Analytics, or tracking is blocked on client
  // no point loading the rest of the analytics bundles
  if (!env.GOOGLE_ANALYTICS_ID || !window.ga) return;
  // https://github.com/googleanalytics/autotrack/issues/137#issuecomment-305890099
  await import(
    /* webpackChunkName: "autotrack" */
    "autotrack/autotrack.js"
  );
  window.ga("require", "outboundLinkTracker");
  window.ga("require", "urlChangeTracker");
  window.ga("require", "eventTracker", {
    attributePrefix: "data-",
  });
});
