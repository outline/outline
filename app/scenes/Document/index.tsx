import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useTrackLastVisitedPath } from "~/hooks/useLastVisitedPath";
import useStores from "~/hooks/useStores";
import history, { patchLocation } from "~/utils/history";
import DataLoader from "./components/DataLoader";
import Document from "./components/Document";
import { Footer } from "./components/Footer";

type Params = {
  documentSlug: string;
  revisionId?: string;
};

export default function DocumentScene() {
  const { ui } = useStores();
  const location = useLocation();
  const { documentSlug, revisionId } = useParams<Params>();
  const currentPath = location.pathname;
  useTrackLastVisitedPath(currentPath);

  useEffect(() => () => ui.clearActiveDocument(), [ui]);

  useEffect(() => {
    // When opening a document directly on app load, sidebarContext will not be set.
    if (!location.state?.sidebarContext) {
      history.replace(
        patchLocation(location, {
          state: { ...location.state, sidebarContext: "collections" }, // optimistic preference of "collections"
        })
      );
    }
  }, [location]);

  // the urlId portion of the url does not include the slugified title
  // we only want to force a re-mount of the document component when the
  // document changes, not when the title does so only this portion is used
  // for the key.
  const urlParts = documentSlug ? documentSlug.split("-") : [];
  const urlId = urlParts.length ? urlParts[urlParts.length - 1] : undefined;

  // Normalize the key so that it is *stable* between renders.
  // Without this, the initial value can be "<urlId>/undefined" and then flip to
  // "<urlId>/" when React stringifies `undefined` on the next render, causing a
  // full unmount/mount cycle of the document subtree. Keeping the key constant
  // prevents extra network requests and preserves editor state on resize.
  const key = revisionId ? `${urlId}/${revisionId}` : urlId;

  return (
    <DataLoader key={key}>
      {(rest) => (
        <Document {...rest}>
          <Footer document={rest.document} />
        </Document>
      )}
    </DataLoader>
  );
}
