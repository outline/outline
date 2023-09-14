import { observer } from "mobx-react";
import * as React from "react";
import { useLocation, RouteComponentProps, StaticContext } from "react-router";
import { NavigationNode, TeamPreference } from "@shared/types";
import { RevisionHelper } from "@shared/utils/RevisionHelper";
import Document from "~/models/Document";
import Revision from "~/models/Revision";
import Error404 from "~/scenes/Error404";
import ErrorOffline from "~/scenes/ErrorOffline";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import Logger from "~/utils/Logger";
import { NotFoundError, OfflineError } from "~/utils/errors";
import history from "~/utils/history";
import { matchDocumentEdit, settingsPath } from "~/utils/routeHelpers";
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
  readOnly: boolean;
  onCreateLink: (title: string) => Promise<string>;
  sharedTree: NavigationNode | undefined;
}) => React.ReactNode;

type Props = RouteComponentProps<Params, StaticContext, LocationState> & {
  children: Children;
};

function DataLoader({ match, children }: Props) {
  const {
    ui,
    views,
    shares,
    comments,
    documents,
    auth,
    revisions,
    subscriptions,
  } = useStores();
  const { team } = auth;
  const [error, setError] = React.useState<Error | null>(null);
  const { revisionId, shareId, documentSlug } = match.params;

  // Allows loading by /doc/slug-<urlId> or /doc/<id>
  const document =
    documents.getByUrl(match.params.documentSlug) ??
    documents.get(match.params.documentSlug);

  const revision = revisionId
    ? revisions.get(
        revisionId === "latest"
          ? RevisionHelper.latestId(document?.id)
          : revisionId
      )
    : undefined;

  const sharedTree = document
    ? documents.getSharedTree(document.id)
    : undefined;
  const isEditRoute =
    match.path === matchDocumentEdit || match.path.startsWith(settingsPath());
  const isEditing = isEditRoute || !auth.user?.separateEditMode;
  const can = usePolicy(document?.id);
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
    void fetchDocument();
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
    void fetchRevision();
  }, [revisions, revisionId]);

  React.useEffect(() => {
    async function fetchRevision() {
      if (document && revisionId === "latest") {
        try {
          await revisions.fetchLatest(document.id);
        } catch (err) {
          setError(err);
        }
      }
    }
    void fetchRevision();
  }, [document, revisionId, revisions]);

  React.useEffect(() => {
    async function fetchSubscription() {
      if (document?.id && !revisionId) {
        try {
          await subscriptions.fetchPage({
            documentId: document.id,
            event: "documents.update",
          });
        } catch (err) {
          Logger.error("Failed to fetch subscriptions", err);
        }
      }
    }
    void fetchSubscription();
  }, [document?.id, subscriptions, revisionId]);

  React.useEffect(() => {
    async function fetchViews() {
      if (document?.id && !document?.isDeleted && !revisionId) {
        try {
          await views.fetchPage({
            documentId: document.id,
          });
        } catch (err) {
          Logger.error("Failed to fetch views", err);
        }
      }
    }
    void fetchViews();
  }, [document?.id, document?.isDeleted, revisionId, views]);

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
        if (team?.getPreference(TeamPreference.Commenting)) {
          void comments.fetchDocumentComments(document.id, {
            limit: 100,
          });
        }

        shares.fetch(document.id).catch((err) => {
          if (!(err instanceof NotFoundError)) {
            throw err;
          }
        });
      }
    }
  }, [can.read, can.update, document, isEditRoute, comments, team, shares, ui]);

  if (error) {
    return error instanceof OfflineError ? <ErrorOffline /> : <Error404 />;
  }

  if (!document || !team || (revisionId && !revision)) {
    return (
      <>
        <Loading location={location} />
      </>
    );
  }

  return (
    <React.Fragment>
      {children({
        document,
        revision,
        abilities: can,
        readOnly:
          !isEditing || !can.update || document.isArchived || !!revisionId,
        onCreateLink,
        sharedTree,
      })}
    </React.Fragment>
  );
}

export default observer(DataLoader);
