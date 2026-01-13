import { useEffect } from "react";
import type { StaticContext } from "react-router";
import { useHistory } from "react-router";
import type { RouteComponentProps } from "react-router-dom";
import type { SidebarContextType } from "~/components/Sidebar/components/SidebarContext";
import { useLastVisitedPath } from "~/hooks/useLastVisitedPath";
import useStores from "~/hooks/useStores";
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
  const { documentSlug, revisionId } = props.match.params;
  const currentPath = props.location.pathname;
  const [, setLastVisitedPath] = useLastVisitedPath();

  useEffect(() => {
    setLastVisitedPath(currentPath);
  }, [currentPath, setLastVisitedPath]);

  useEffect(() => () => ui.clearActiveDocument(), [ui]);
  //  Listen for opening comments sidebar from keyboard shortcut
  useEffect(() => {
    const handleOpenCommentsSidebar = (event: Event) => {
      ui.toggleComments();

      const customEvent = event as CustomEvent;
      if (customEvent.detail?.autoFocus) {
        const focusComment = (attempts = 0) => {
          // Get all ProseMirror editors
          const allEditors = document.querySelectorAll('.ProseMirror[role="textbox"]');

          // The comment editor should be the one with the "Add a comment…" placeholder
          let commentInput: HTMLDivElement | null = null;
          allEditors.forEach((editor) => {
            const placeholder = editor.querySelector('p[data-empty-text="Add a comment…"]');
            if (placeholder) {
              commentInput = editor as HTMLDivElement;
            }
          });

          if (commentInput) {
            (commentInput as HTMLDivElement).focus();
            (commentInput as HTMLDivElement).click();
          } else if (attempts < 20) {
            setTimeout(() => focusComment(attempts + 1), 100);
          } else {
            console.log("Failed to find comment input after 20 attempts");
          }
        };

        setTimeout(focusComment, 100);
      }
    };

    document.addEventListener('openCommentsSidebar', handleOpenCommentsSidebar);

    return () => {
      document.removeEventListener('openCommentsSidebar', handleOpenCommentsSidebar);
    };
  }, [ui]);

  useEffect(() => {
    // When opening a document directly on app load, sidebarContext will not be set.
    if (!props.location.state?.sidebarContext) {
      history.replace({
        ...props.location,
        state: { ...props.location.state, sidebarContext: "collections" },
      });
    }
  }, [props.location, history]);

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
    <DataLoader
      key={key}
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
