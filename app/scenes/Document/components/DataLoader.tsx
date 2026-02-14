import { observer } from "mobx-react";
import * as React from "react";
import type { RouteComponentProps, StaticContext } from "react-router";
import { useLocation } from "react-router";
import { TeamPreference } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { RevisionHelper } from "@shared/utils/RevisionHelper";
import type Document from "~/models/Document";
import type Revision from "~/models/Revision";
import Error402 from "~/scenes/Errors/Error402";
import Error403 from "~/scenes/Errors/Error403";
import Error404 from "~/scenes/Errors/Error404";
import ErrorOffline from "~/scenes/Errors/ErrorOffline";
import ErrorUnknown from "~/scenes/Errors/ErrorUnknown";
import { useDocumentContext } from "~/components/DocumentContext";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import type { Properties } from "~/types";
import Logger from "~/utils/Logger";
import {
  AuthorizationError,
  NotFoundError,
  OfflineError,
  PaymentRequiredError,
} from "~/utils/errors";
import history from "~/utils/history";
import { matchDocumentEdit, settingsPath } from "~/utils/routeHelpers";
import Loading from "./Loading";
import MarkAsViewed from "./MarkAsViewed";

type Params = {
  /** The document urlId + slugified title  */
  documentSlug: string;
  /** A specific revision id to load. */
  revisionId?: string;
};

type LocationState = {
  /** The document title, if preloaded */
  title?: string;
  restore?: boolean;
  revisionId?: string;
};

type Children = (options: {
  document: Document;
  revision: Revision | undefined;
  abilities: Record<string, boolean>;
  readOnly: boolean;
  onCreateLink: (
    params: Properties<Document>,
    nested?: boolean
  ) => Promise<string>;
}) => React.ReactNode;

type Props = RouteComponentProps<Params, StaticContext, LocationState> & {
  children: Children;
};

function DataLoader({ match, children }: Props) {
  const { ui, views, shares, comments, documents, revisions } = useStores();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const { setDocument } = useDocumentContext();
  const [error, setError] = React.useState<Error | null>(null);
  const { revisionId, documentSlug } = match.params;

  // Allows loading by /doc/slug-<urlId> or /doc/<id>
  const document = documents.get(match.params.documentSlug);

  if (document) {
    setDocument(document);
  }

  const revision = revisionId
    ? revisions.get(
        revisionId === "latest"
          ? RevisionHelper.latestId(document?.id)
          : revisionId
      )
    : undefined;

  const isEditRoute =
    match.path === matchDocumentEdit || match.path.startsWith(settingsPath());
  const isEditing = isEditRoute || !user?.separateEditMode;
  const can = usePolicy(document);
  const location = useLocation<LocationState>();
  const missingPolicy = !can || Object.keys(can).length === 0;

  React.useEffect(() => {
    async function fetchDocument() {
      try {
        await documents.fetch(documentSlug, {
          force: missingPolicy,
        });
      } catch (err) {
        setError(err);
      }
    }
    void fetchDocument();
  }, [ui, documents, missingPolicy, documentSlug]);

  React.useEffect(() => {
    async function fetchRevision() {
      if (!revisionId) {
        return;
      }
      try {
        if (revisionId === "latest") {
          if (document?.id) {
            await revisions.fetchLatest(document.id);
          }
        } else {
          await revisions.fetch(revisionId);
        }
      } catch (err) {
        setError(err);
      }
    }
    void fetchRevision();
  }, [revisions, revisionId, document?.id]);

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
    async (params: Properties<Document>, nested?: boolean) => {
      if (!document) {
        throw new Error("Document not loaded yet");
      }

      const newDocument = await documents.create(
        {
          collectionId: nested ? undefined : document.collectionId,
          parentDocumentId: nested ? document.id : document.parentDocumentId,
          data: ProsemirrorHelper.getEmptyDocument(),
          ...params,
        },
        {
          publish: document.isDraft ? undefined : true,
        }
      );

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
      if (!missingPolicy && !can.update && isEditRoute && !document.template) {
        history.push(document.url);
        return;
      }

      // Prevents unauthorized request to load share information for the document
      // when viewing a public share link
      if (can.read && !document.isDeleted && !revisionId) {
        if (team.getPreference(TeamPreference.Commenting)) {
          void comments.fetchAll({
            documentId: document.id,
            limit: 100,
            direction: "ASC",
          });
        }

        shares.fetchOne({ documentId: document.id }).catch((err) => {
          if (!(err instanceof NotFoundError)) {
            throw err;
          }
        });
      }
    }
  }, [
    can.read,
    can.update,
    document,
    isEditRoute,
    comments,
    team,
    shares,
    ui,
    revisionId,
  ]);

  if (error) {
    return error instanceof OfflineError ? (
      <ErrorOffline />
    ) : error instanceof PaymentRequiredError ? (
      <Error402 />
    ) : error instanceof AuthorizationError ? (
      <Error403 />
    ) : error instanceof NotFoundError ? (
      <Error404 />
    ) : (
      <ErrorUnknown />
    );
  }

  if (can.read === false) {
    return <Error404 />;
  }

  if (!document || (revisionId && !revision)) {
    return (
      <>
        <Loading location={location} />
      </>
    );
  }

  const canEdit = can.update && !document.isArchived && !revisionId;
  const readOnly = !isEditing || !canEdit;

  return (
    <>
      {!revision && <MarkAsViewed document={document} />}
      <React.Fragment key={canEdit ? "edit" : "read"}>
        {children({
          document,
          revision,
          abilities: can,
          readOnly,
          onCreateLink,
        })}
      </React.Fragment>
    </>
  );
}

export default observer(DataLoader);
