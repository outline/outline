import { observer } from "mobx-react";
import * as React from "react";
import { Route, matchPath, useLocation } from "react-router-dom";
import {
  RightSidebarWrappedContext,
  useSetRightSidebar,
} from "~/components/RightSidebarContext";
import RightSidebar from "~/components/Sidebar/Right";
import PlaceholderText from "~/components/PlaceholderText";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
import lazyWithRetry from "~/utils/lazyWithRetry";
import { matchDocumentHistory, matchDocumentSlug } from "~/utils/routeHelpers";
import SidebarLayout from "~/scenes/Document/components/SidebarLayout";

const DocumentComments = lazyWithRetry(
  () => import("~/scenes/Document/components/Comments/Comments")
);
const DocumentHistory = lazyWithRetry(
  () => import("~/scenes/Document/components/History")
);

interface DocumentSidebarContentProps {
  skipInitialAnimation?: boolean;
}

/**
 * Stable component that reads `ui.rightSidebar` and renders the appropriate
 * sidebar content. On desktop, wraps content in a single Right sidebar that
 * stays mounted across panel switches to avoid re-triggering the open/close
 * animation.
 */
const DocumentSidebarContent = observer(function DocumentSidebarContent({
  skipInitialAnimation,
}: DocumentSidebarContentProps) {
  const { ui } = useStores();
  const isMobile = useMobile();

  const inner = (
    <Route path={`/doc/${matchDocumentSlug}`}>
      <React.Suspense
        fallback={
          <SidebarLayout title={<PlaceholderText width={100} />}>
            {null}
          </SidebarLayout>
        }
      >
        {ui.rightSidebar === "comments" && <DocumentComments />}
        {ui.rightSidebar === "history" && <DocumentHistory />}
      </React.Suspense>
    </Route>
  );

  if (isMobile) {
    return inner;
  }

  return (
    <RightSidebar skipInitialAnimation={skipInitialAnimation}>
      <RightSidebarWrappedContext.Provider value={true}>
        {inner}
      </RightSidebarWrappedContext.Provider>
    </RightSidebar>
  );
});

/**
 * Manages the right sidebar for the Document scene. Syncs the history route
 * to store state, sets a stable component into the sidebar context when open,
 * and clears it when closed or on unmount.
 */
export default function useDocumentSidebar() {
  const { ui } = useStores();
  const location = useLocation();
  const setSidebar = useSetRightSidebar();
  const isHistoryRoute = !!matchPath(location.pathname, {
    path: matchDocumentHistory,
  });
  const isOpen = ui.rightSidebar !== null;
  const isInitialOpenRef = React.useRef(isOpen);

  React.useEffect(() => {
    if (isHistoryRoute) {
      ui.set({ rightSidebar: "history" });
    } else if (ui.rightSidebar === "history") {
      ui.set({ rightSidebar: null });
    }
  }, [isHistoryRoute, ui]);

  React.useEffect(() => {
    if (isOpen) {
      setSidebar(
        <DocumentSidebarContent
          skipInitialAnimation={isInitialOpenRef.current}
        />
      );
      isInitialOpenRef.current = false;
    } else {
      setSidebar(null);
    }
  }, [isOpen, setSidebar]);

  React.useEffect(
    () => () => {
      setSidebar(null);
    },
    [setSidebar]
  );
}
