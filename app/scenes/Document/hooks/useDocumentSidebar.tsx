import { observer } from "mobx-react";
import * as React from "react";
import { Route, matchPath, useHistory, useLocation } from "react-router-dom";
import {
  RightSidebarWrappedContext,
  useSetRightSidebar,
} from "~/components/RightSidebarContext";
import Aside from "~/components/Sidebar/Aside";
import PlaceholderText from "~/components/PlaceholderText";
import { useSplitView } from "~/components/SplitView/context";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
import lazyWithRetry from "~/utils/lazyWithRetry";
import {
  documentPath,
  matchDocumentHistory,
  matchDocumentSlug,
} from "~/utils/routeHelpers";
import SidebarLayout from "~/scenes/Document/components/SidebarLayout";

const DocumentComments = lazyWithRetry(
  () => import("~/scenes/Document/components/Comments/Comments")
);
const DocumentHistory = lazyWithRetry(
  () => import("~/scenes/Document/components/History/History")
);

interface DocumentSidebarContentProps {
  skipInitialAnimation?: boolean;
}

/**
 * Stable component that reads `ui.rightSidebar` and renders the appropriate
 * sidebar content. On desktop, wraps content in a single Aside sidebar that
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
    <Aside skipInitialAnimation={skipInitialAnimation}>
      <RightSidebarWrappedContext.Provider value={true}>
        {inner}
      </RightSidebarWrappedContext.Provider>
    </Aside>
  );
});

/**
 * Manages the right sidebar for the Document scene. Syncs the history route
 * to store state, sets a stable component into the sidebar context when open,
 * and clears it when closed or on unmount.
 *
 * In a split view the sidebar content is rendered into the pane's own sidebar
 * slot, so each pane displays the panels for its own document. Only the
 * focused pane syncs the history route with the shared panel state.
 */
export default function useDocumentSidebar() {
  const { ui, documents } = useStores();
  const location = useLocation();
  const paneHistory = useHistory();
  const { isFocused } = useSplitView();
  const setSidebar = useSetRightSidebar();
  const isHistoryRoute = !!matchPath(location.pathname, {
    path: matchDocumentHistory,
  });
  const isOpen = ui.rightSidebar !== null;
  const wasOpenRef = React.useRef(isOpen);

  React.useEffect(() => {
    if (!isFocused) {
      return;
    }

    if (isHistoryRoute) {
      ui.set({ rightSidebar: "history" });
    } else if (ui.rightSidebar === "history") {
      ui.set({ rightSidebar: null });
    }
  }, [isFocused, isHistoryRoute, ui]);

  // When the sidebar switches away from history while still on a /history URL,
  // update the URL to remove the /history suffix.
  React.useEffect(() => {
    if (isFocused && isHistoryRoute && ui.rightSidebar !== "history") {
      const document = ui.activeDocumentId
        ? documents.get(ui.activeDocumentId)
        : undefined;
      if (document) {
        paneHistory.push(documentPath(document));
      }
    }
  }, [
    isFocused,
    ui.rightSidebar,
    isHistoryRoute,
    ui.activeDocumentId,
    documents,
    paneHistory,
  ]);

  React.useEffect(() => {
    if (isOpen) {
      setSidebar(
        <DocumentSidebarContent skipInitialAnimation={wasOpenRef.current} />
      );
    } else {
      setSidebar(null);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, setSidebar]);

  React.useEffect(
    () => () => {
      setSidebar(null);
    },
    [setSidebar]
  );
}
