import * as React from "react";
import { useHistory } from "react-router-dom";
import { isInternalUrl } from "@shared/utils/urls";
import { isModKey } from "~/utils/keyboard";
import { sharedDocumentPath } from "~/utils/routeHelpers";
import { isHash } from "~/utils/urls";

type Params = {
  /** The share ID of the document being viewed, if any */
  shareId?: string;
};

export default function useEditorClickHandlers({ shareId }: Params) {
  const history = useHistory();
  const handleClickLink = React.useCallback(
    (href: string, event: MouseEvent) => {
      // on page hash
      if (isHash(href)) {
        window.location.href = href;
        return;
      }

      if (isInternalUrl(href) && !isModKey(event) && !event.shiftKey) {
        // relative
        let navigateTo = href;

        // probably absolute
        if (href[0] !== "/") {
          try {
            const url = new URL(href);
            navigateTo = url.pathname + url.hash;
          } catch (err) {
            navigateTo = href;
          }
        }

        // Link to our own API should be opened in a new tab, not in the app
        if (navigateTo.startsWith("/api/")) {
          window.open(href, "_blank");
          return;
        }

        // If we're navigating to a share link from a non-share link then open it in a new tab
        if (shareId && navigateTo.startsWith("/s/")) {
          window.open(href, "_blank");
          return;
        }

        // If we're navigating to an internal document link then prepend the
        // share route to the URL so that the document is loaded in context
        if (shareId && navigateTo.includes("/doc/")) {
          navigateTo = sharedDocumentPath(shareId, navigateTo);
        }

        history.push(navigateTo);
      } else if (href) {
        window.open(href, "_blank");
      }
    },
    [history, shareId]
  );

  return { handleClickLink };
}
