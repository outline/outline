import { useCallback } from "react";
import { useHistory } from "react-router-dom";
import { isModKey } from "@shared/utils/keyboard";
import { isDocumentUrl, isInternalUrl } from "@shared/utils/urls";
import { sharedModelPath } from "~/utils/routeHelpers";
import { isHash } from "~/utils/urls";
import useStores from "./useStores";
import { isFirefox } from "@shared/utils/browser";

type Params = {
  /** The share ID of the document being viewed, if any */
  shareId?: string;
};

export default function useEditorClickHandlers({ shareId }: Params) {
  const history = useHistory();
  const { documents } = useStores();
  const handleClickLink = useCallback(
    (href: string, event?: MouseEvent) => {
      // on page hash
      if (isHash(href)) {
        window.location.href = href;
        return;
      }

      let navigateTo = href;

      // Middle-click events in Firefox are not prevented in the same way as other browsers
      // so we need to explicitly return here to prevent two tabs from being opened when
      // middle-clicking a link (#10083).
      if (event?.button === 1 && isFirefox) {
        return;
      }

      if (isInternalUrl(href)) {
        // probably absolute
        if (href[0] !== "/") {
          try {
            const url = new URL(href);
            navigateTo = url.pathname + url.search + url.hash;
          } catch (_err) {
            navigateTo = href;
          }
        }

        // Link to our own API should be opened in a new tab, not in the app
        if (navigateTo.startsWith("/api/")) {
          window.open(href, "_blank");
          return;
        }

        // parse shareId from link
        const linkShareId = navigateTo.match(/\/s\/([^/]+)\/doc\//)?.[1];

        // If we're navigating to an internal document link then prepend the
        // share route to the URL so that the document is loaded in context
        if (
          shareId &&
          (!linkShareId || linkShareId === shareId) &&
          (navigateTo.includes("/doc/") ||
            navigateTo.includes("/collection/")) &&
          !navigateTo.includes(shareId)
        ) {
          navigateTo = sharedModelPath(shareId, navigateTo);
        }

        if (isDocumentUrl(navigateTo)) {
          const document = documents.get(navigateTo);
          if (document) {
            navigateTo = document.path;
          }
        }

        // If we're navigating to a share link from a non-share link then open it in a new tab
        if (!shareId && navigateTo.startsWith("/s/")) {
          window.open(href, "_blank");
          return;
        }

        if (
          !event ||
          (!isModKey(event) && !event.shiftKey && event.button !== 1)
        ) {
          history.push(navigateTo, { sidebarContext: "collections" }); // optimistic preference of "collections"
        } else {
          window.open(navigateTo, "_blank");
        }
      } else {
        window.open(href, "_blank");
      }
    },
    [history, shareId]
  );

  return { handleClickLink };
}
