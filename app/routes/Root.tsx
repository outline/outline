import { LazyMotion, domMax } from "framer-motion";
import { KBarProvider } from "kbar";
import { Provider } from "mobx-react";
import { Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Outlet } from "react-router-dom";
import stores from "~/stores";
import Analytics from "~/components/Analytics";
import DelayedMount from "~/components/DelayedMount";
import Desktop from "~/components/DesktopEventHandler";
import Dialogs from "~/components/Dialogs";
import ErrorBoundary from "~/components/ErrorBoundary";
import FullscreenLoading from "~/components/FullscreenLoading";
import LazyPolyfill from "~/components/LazyPolyfills";
import PageScroll from "~/components/PageScroll";
import PageTheme from "~/components/PageTheme";
import Presentation from "~/components/Presentation";
import ScrollToTop from "~/components/ScrollToTop";
import Theme from "~/components/Theme";
import Toasts from "~/components/Toasts";
import { ActionContextProvider } from "~/hooks/useActionContext";
import useAutoRefresh from "~/hooks/useAutoRefresh";

const commandBarOptions = {
  animations: {
    enterMs: 250,
    exitMs: 200,
  },
};

function RouteOutlet() {
  useAutoRefresh();

  return (
    <Suspense
      fallback={
        <DelayedMount delay={2000}>
          <FullscreenLoading />
        </DelayedMount>
      }
    >
      <Outlet />
    </Suspense>
  );
}

/**
 * The root layout route for the application. Provides all top-level context
 * providers and renders the matched route via an outlet. This element remains
 * mounted across navigations so providers persist between routes.
 */
export default function Root() {
  return (
    <HelmetProvider>
      <Provider rootStore={stores}>
        <Analytics>
          <Theme>
            <ActionContextProvider>
              <ErrorBoundary showTitle>
                <KBarProvider actions={[]} options={commandBarOptions}>
                  <LazyPolyfill>
                    <LazyMotion features={domMax}>
                      <PageScroll>
                        <PageTheme />
                        <ScrollToTop>
                          <RouteOutlet />
                        </ScrollToTop>
                        <Toasts />
                        <Dialogs />
                        <Presentation />
                        <Desktop />
                      </PageScroll>
                    </LazyMotion>
                  </LazyPolyfill>
                </KBarProvider>
              </ErrorBoundary>
            </ActionContextProvider>
          </Theme>
        </Analytics>
      </Provider>
    </HelmetProvider>
  );
}
