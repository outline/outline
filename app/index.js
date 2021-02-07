// @flow
import "focus-visible";
import { createBrowserHistory } from "history";
import { Provider } from "mobx-react";
import * as React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { render } from "react-dom";
import { Router } from "react-router-dom";
import { initI18n } from "shared/i18n";
import stores from "stores";
import ErrorBoundary from "components/ErrorBoundary";
import ScrollToTop from "components/ScrollToTop";
import Theme from "components/Theme";
import Toasts from "components/Toasts";
import Routes from "./routes";
import env from "env";
import { initSentry } from "utils/sentry";

initI18n();

const element = document.getElementById("root");
const history = createBrowserHistory();

if (env.SENTRY_DSN) {
  initSentry(history);
}

if (element) {
  render(
    <Provider {...stores}>
      <Theme>
        <ErrorBoundary>
          <DndProvider backend={HTML5Backend}>
            <Router history={history}>
              <>
                <ScrollToTop>
                  <Routes />
                </ScrollToTop>
                <Toasts />
              </>
            </Router>
          </DndProvider>
        </ErrorBoundary>
      </Theme>
    </Provider>,
    element
  );
}

window.addEventListener("load", async () => {
  // installation does not use Google Analytics, or tracking is blocked on client
  // no point loading the rest of the analytics bundles
  if (!env.GOOGLE_ANALYTICS_ID || !window.ga) return;

  // https://github.com/googleanalytics/autotrack/issues/137#issuecomment-305890099
  await import("autotrack/autotrack.js");

  window.ga("require", "outboundLinkTracker");
  window.ga("require", "urlChangeTracker");
  window.ga("require", "eventTracker", {
    attributePrefix: "data-",
  });
});
