import { useEffect } from "react";
import type { StaticContext } from "react-router";
import { useHistory } from "react-router";
import type { RouteComponentProps } from "react-router-dom";
import type { SidebarContextType } from "~/components/Sidebar/components/SidebarContext";
import { useSplitView } from "~/components/SplitView/context";
import { useTrackLastVisitedPath } from "~/hooks/useLastVisitedPath";
import useStores from "~/hooks/useStores";
import { patchLocation } from "~/utils/history";
import { getFocusedSplitPane } from "~/utils/splitView";
import DataLoader from "./components/DataLoader";
import Document from "./components/Document";
import { Footer } from "./components/Footer";

type Params = {
  documentSlug: string;
  revisionId?: string;
};

type LocationState = {
  title?: string;
  restore?: boolean;
  revisionId?: string;
  sidebarContext?: SidebarContextType;
};

type Props = RouteComponentProps<Params, StaticContext, LocationState>;

export default function DocumentScene(props: Props) {
  const { ui } = useStores();
  const history = useHistory();
  const { pane, isSplitView } = useSplitView();
  const { documentSlug } = props.match.params;
  const currentPath = props.location.pathname;
  useTrackLastVisitedPath(currentPath);

  useEffect(
    () => () => {
      // In a split view only the focused pane owns the active document, so an
      // unfocused pane unmounting must not clear the focused pane's state.
      if (!isSplitView || pane === getFocusedSplitPane()) {
        ui.clearActiveDocument();
      }
    },
    [ui, isSplitView, pane]
  );

  useEffect(() => {
    // When opening a document directly on app load, sidebarContext will not be set.
    if (!props.location.state?.sidebarContext) {
      history.replace(
        patchLocation(props.location, {
          state: { ...props.location.state, sidebarContext: "collections" }, // optimistic preference of "collections"
        })
      );
    }
  }, [props.location, history]);

  // the urlId portion of the url does not include the slugified title
  // we only want to force a re-mount of the document component when the
  // document changes, not when the title does so only this portion is used
  // for the key.
  const urlParts = documentSlug ? documentSlug.split("-") : [];
  const urlId = urlParts.length ? urlParts[urlParts.length - 1] : undefined;

  // The revision is deliberately not part of the key: remounting the subtree
  // between revisions would empty the page while the next one loads and reset
  // the scroll position. DataLoader refetches when the revision id changes.
  return (
    <DataLoader
      key={urlId}
      match={props.match}
      history={props.history}
      location={props.location}
    >
      {(rest) => (
        <Document {...rest}>
          <Footer document={rest.document} />
        </Document>
      )}
    </DataLoader>
  );
}
