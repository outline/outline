import { observer } from "mobx-react";
import * as React from "react";
import {
  Route,
  Router,
  matchPath,
  useHistory,
  useLocation,
} from "react-router-dom";
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
import { getFocusedSplitPane } from "~/utils/splitView";
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
 * In a split view only the focused pane manages the sidebar, so the sidebar
 * always represents the active document. The content is wrapped in the pane's
 * router so panels resolve their document from, and navigate, the owning pane.
 */
export default function useDocumentSidebar() {
  const { ui, documents } = useStores();
  const location = useLocation();
  const paneHistory = useHistory();
  const { pane, isSplitView, isFocused } = useSplitView();
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
    if (!isFocused) {
      return;
    }

    if (isOpen) {
      setSidebar(
        <Router key={pane} history={paneHistory}>
          <DocumentSidebarContent skipInitialAnimation={wasOpenRef.current} />
        </Router>
      );
    } else {
      setSidebar(null);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, isFocused, pane, paneHistory, setSidebar]);

  React.useEffect(
    () => () => {
      // In a split view only the focused pane owns the sidebar, so an
      // unfocused pane unmounting must not clear the focused pane's sidebar.
      if (!isSplitView || pane === getFocusedSplitPane()) {
        setSidebar(null);
      }
    },
    [setSidebar, isSplitView, pane]
  );
}
