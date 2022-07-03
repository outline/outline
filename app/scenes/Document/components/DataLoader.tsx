import { observer } from "mobx-react";
import * as React from "react";
import { useLocation, RouteComponentProps, StaticContext } from "react-router";
import Document from "~/models/Document";
import Revision from "~/models/Revision";
import Error404 from "~/scenes/Error404";
import ErrorOffline from "~/scenes/ErrorOffline";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { NavigationNode } from "~/types";
import { NotFoundError, OfflineError } from "~/utils/errors";
import history from "~/utils/history";
import { matchDocumentEdit } from "~/utils/routeHelpers";
import HideSidebar from "./HideSidebar";
import Loading from "./Loading";

type Params = {
  documentSlug: string;
  revisionId?: string;
  shareId?: string;
};

type LocationState = {
  title?: string;
  restore?: boolean;
  revisionId?: string;
};

type Children = (options: {
  document: Document;
  revision: Revision | undefined;
  abilities: Record<string, boolean>;
  isEditing: boolean;
  readOnly: boolean;
  onCreateLink: (title: string) => Promise<string>;
  sharedTree: NavigationNode | undefined;
}) => React.ReactNode;

type Props = RouteComponentProps<Params, StaticContext, LocationState> & {
  children: Children;
};

function DataLoader({ match, children }: Props) {
  const { ui, shares, documents, auth, revisions } = useStores();
  const { team } = auth;
  const [error, setError] = React.useState<Error | null>(null);
  const { revisionId, shareId, documentSlug } = match.params;
  const document = documents.getByUrl(match.params.documentSlug);
  const revision = revisionId ? revisions.get(revisionId) : undefined;
  const sharedTree = document
    ? documents.getSharedTree(document.id)
    : undefined;
  const isEditRoute = match.path === matchDocumentEdit;
  const isEditing = isEditRoute || !!auth.team?.collaborativeEditing;
  const can = usePolicy(document ? document.id : "");
  const location = useLocation<LocationState>();

  React.useEffect(() => {
    async function fetchDocument() {
      try {
        await documents.fetchWithSharedTree(documentSlug, {
          shareId,
        });
      } catch (err) {
        setError(err);
      }
    }
    fetchDocument();
  }, [ui, documents, document, shareId, documentSlug]);

  React.useEffect(() => {
    async function fetchRevision() {
      if (revisionId && revisionId !== "latest") {
        try {
          await revisions.fetch(revisionId);
        } catch (err) {
          setError(err);
        }
      }
    }
    fetchRevision();
  }, [revisions, revisionId]);

  const onCreateLink = React.useCallback(
    async (title: string) => {
      if (!document) {
        throw new Error("Document not loaded yet");
      }

      const newDocument = await documents.create({
        collectionId: document.collectionId,
        parentDocumentId: document.parentDocumentId,
        title,
        text: "",
      });

      return newDocument.url;
    },
    [document, documents]
  );

  React.useEffect(() => {
    if (document) {
      // sets the current document as active in the sidebar
      ui.setActiveDocument(document);

      // If we're attempting to update an archived, deleted, or otherwise
      // uneditable document then forward to the canonical read url.
      if (!can.update && isEditRoute) {
        history.push(document.url);
        return;
      }

      // Prevents unauthorized request to load share information for the document
      // when viewing a public share link
      if (can.read) {
        shares.fetch(document.id).catch((err) => {
          if (!(err instanceof NotFoundError)) {
            throw err;
          }
        });
      }
    }
  }, [can.read, can.update, document, isEditRoute, shares, ui]);

  if (error) {
    return error instanceof OfflineError ? <ErrorOffline /> : <Error404 />;
  }

  if (!document || !team || (revisionId && !revision)) {
    return (
      <>
        <Loading location={location} />
        {isEditing && !team?.collaborativeEditing && <HideSidebar ui={ui} />}
      </>
    );
  }

  // We do not want to remount the document when changing from view->edit
  // on the multiplayer flag as the doc is guaranteed to be upto date.
  const key = team.collaborativeEditing
    ? ""
    : isEditing
    ? "editing"
    : "read-only";

  return (
    <React.Fragment key={key}>
      {isEditing && !team.collaborativeEditing && <HideSidebar ui={ui} />}
      {children({
        document,
        revision,
        abilities: can,
        isEditing,
        readOnly:
          !isEditing || !can.update || document.isArchived || !!revisionId,
        onCreateLink,
        sharedTree,
      })}
    </React.Fragment>
  );
}

export default observer(DataLoader);
