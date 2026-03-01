import { observer } from "mobx-react";
import * as React from "react";
import { Route } from "react-router-dom";
import {
  RightSidebarWrappedContext,
  useSetRightSidebar,
} from "~/components/RightSidebarContext";
import RightSidebar from "~/components/Sidebar/Right";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
import lazyWithRetry from "~/utils/lazyWithRetry";
import { matchDocumentSlug } from "~/utils/routeHelpers";

const DocumentComments = lazyWithRetry(
  () => import("~/scenes/Document/components/Comments/Comments")
);
const DocumentHistory = lazyWithRetry(
  () => import("~/scenes/Document/components/History")
);
const SidebarLayout = lazyWithRetry(
  () => import("~/scenes/Document/components/SidebarLayout")
);
const PlaceholderText = lazyWithRetry(
  () => import("~/components/PlaceholderText")
);

/**
 * Stable component that reads `ui.rightSidebar` and renders the appropriate
 * sidebar content. On desktop, wraps content in a single Right sidebar that
 * stays mounted across panel switches to avoid re-triggering the open/close
 * animation.
 */
const DocumentSidebarContent = observer(function DocumentSidebarContent() {
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
    <RightSidebar>
      <RightSidebarWrappedContext.Provider value={true}>
        {inner}
      </RightSidebarWrappedContext.Provider>
    </RightSidebar>
  );
});

/**
 * Manages the right sidebar for the Document scene. Sets a stable component
 * into the sidebar context when open, and clears it when closed or on unmount.
 */
export default function useDocumentSidebar() {
  const { ui } = useStores();
  const setSidebar = useSetRightSidebar();
  const isOpen = ui.rightSidebar !== null;

  React.useEffect(() => {
    if (isOpen) {
      setSidebar(<DocumentSidebarContent />);
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
