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
import lazyWithRetry from "@shared/utils/lazyWithRetry";
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
  const { pane, isSplitView } = useSplitView();
  const isMobile = useMobile();
  const panel = ui.getRightSidebar(pane);

  // The store clears the panel before the sidebar has animated closed, so the
  // last panel stays visible until the content unmounts.
  const [lastPanel, setLastPanel] = React.useState(panel);
  if (panel && panel !== lastPanel) {
    setLastPanel(panel);
  }
  const visiblePanel = panel ?? lastPanel;

  const fallback = (
    <SidebarLayout title={<PlaceholderText width={100} />}>
      {null}
    </SidebarLayout>
  );

  // Both panels stay mounted so that switching between them keeps their state
  // and does not re-suspend on the lazy chunk. Effects, and with them the MobX
  // reactions of observer components, are disposed while a panel is hidden.
  const inner = (
    <Route path={`/doc/${matchDocumentSlug}`}>
      <React.Activity mode={visiblePanel === "comments" ? "visible" : "hidden"}>
        <React.Suspense fallback={fallback}>
          <DocumentComments />
        </React.Suspense>
      </React.Activity>
      <React.Activity mode={visiblePanel === "history" ? "visible" : "hidden"}>
        <React.Suspense fallback={fallback}>
          <DocumentHistory />
        </React.Suspense>
      </React.Activity>
    </Route>
  );

  if (isMobile) {
    return inner;
  }

  return (
    // Skip the width animation in a split view, where the sidebar content
    // would visibly overflow the pane while animating into place.
    <Aside skipInitialAnimation={skipInitialAnimation || isSplitView}>
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
 * In a split view the sidebar state and content are tracked per pane, so each
 * pane opens and closes panels for its own document independently.
 */
export default function useDocumentSidebar() {
  const { ui, documents } = useStores();
  const location = useLocation();
  const paneHistory = useHistory();
  const { pane } = useSplitView();
  const setSidebar = useSetRightSidebar();
  const isHistoryRoute = !!matchPath(location.pathname, {
    path: matchDocumentHistory,
  });
  const panel = ui.getRightSidebar(pane);
  // A history panel outside of a history route is closed by the effect below,
  // so it is treated as closed here – otherwise the sidebar renders open for a
  // frame and then animates away again.
  const isOpen = panel !== null && (panel !== "history" || isHistoryRoute);
  const wasOpenRef = React.useRef(isOpen);

  React.useEffect(() => {
    if (isHistoryRoute) {
      ui.setRightSidebar("history", pane);
    } else if (ui.getRightSidebar(pane) === "history") {
      ui.setRightSidebar(null, pane);
    }
  }, [isHistoryRoute, ui, pane]);

  // When the sidebar switches away from history while still on a /history URL,
  // update the URL to remove the /history suffix. The panel is read from the
  // store at effect time so that navigating to a /history URL, which opens
  // the panel in the effect above within the same commit, is not mistaken
  // for the panel having switched away.
  React.useEffect(() => {
    if (isHistoryRoute && ui.getRightSidebar(pane) !== "history") {
      const slugMatch = matchPath<{ documentSlug: string }>(location.pathname, {
        path: `/doc/${matchDocumentSlug}`,
      });
      const document = slugMatch
        ? documents.get(slugMatch.params.documentSlug)
        : undefined;
      if (document) {
        paneHistory.push({
          pathname: documentPath(document),
          state: location.state,
        });
      }
    }
  }, [
    panel,
    isHistoryRoute,
    location.pathname,
    location.state,
    documents,
    paneHistory,
    ui,
    pane,
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
