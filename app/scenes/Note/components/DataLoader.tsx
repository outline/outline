import { observer } from "mobx-react";
import * as React from "react";
import type { RouteComponentProps, StaticContext } from "react-router";
import { Redirect, useLocation } from "react-router";
import { toError } from "@shared/utils/error";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import { RevisionHelper } from "@shared/utils/RevisionHelper";
import type Note from "~/models/Note";
import type Revision from "~/models/Revision";
import Error402 from "~/scenes/Errors/Error402";
import Error403 from "~/scenes/Errors/Error403";
import Error404 from "~/scenes/Errors/Error404";
import ErrorOffline from "~/scenes/Errors/ErrorOffline";
import ErrorUnknown from "~/scenes/Errors/ErrorUnknown";
import { useNoteContext } from "~/components/NoteContext";
import { useSplitView } from "~/components/SplitView/context";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
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
import {
  matchNoteEdit,
  settingsPath,
  updateNotePath,
} from "~/utils/routeHelpers";
import useNoteSidebar from "../hooks/useNoteSidebar";
import Loading from "./Loading";
import MarkAsViewed from "./MarkAsViewed";
type Params = {
  /** The note urlId + slugified title  */
  noteSlug: string;
  /** A specific revision id to load. */
  revisionId?: string;
};
type LocationState = {
  /** The note title, if preloaded */
  title?: string;
  restore?: boolean;
  revisionId?: string;
};
type Children = (options: {
  note: Note;
  revision: Revision | undefined;
  abilities: Record<string, boolean>;
  readOnly: boolean;
  onCreateLink: (params: Properties<Note>, nested?: boolean) => Promise<string>;
}) => React.ReactNode;
type Props = RouteComponentProps<Params, StaticContext, LocationState> & {
  children: Children;
};
function DataLoader({ match, children }: Props) {
  const { ui, views, shares, comments, notes, revisions } = useStores();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const { setNote } = useNoteContext();
  const [error, setError] = React.useState<Error | null>(null);
  const { revisionId, noteSlug } = match.params;
  // Allows loading by /doc/slug-<urlId> or /doc/<id>
  const note = notes.get(match.params.noteSlug);
  if (note) {
    setNote(note);
  }
  const revision = revisionId
    ? revisions.get(
        revisionId === "latest" ? RevisionHelper.latestId(note?.id) : revisionId
      )
    : undefined;
  const isEditRoute =
    match.path === matchNoteEdit || match.path.startsWith(settingsPath());
  const isEditing = isEditRoute || !user?.separateEditMode;
  const { isFocused: isPaneFocused } = useSplitView();
  const can = usePolicy(note);
  const location = useLocation<LocationState>();
  const query = useQuery();
  const missingPolicy = !can || Object.keys(can).length === 0;
  const isJustCreated = React.useMemo(
    () => !!note?.isJustCreated,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [note?.id]
  );
  useNoteSidebar();
  React.useEffect(() => {
    async function fetchNote() {
      try {
        await notes.fetch(noteSlug, {
          force: missingPolicy,
        });
      } catch (err) {
        setError(toError(err));
      }
    }
    void fetchNote();
  }, [ui, notes, missingPolicy, noteSlug]);
  const fetchRevisionById = React.useCallback(
    async (id: string, onError: (err: Error) => void) => {
      try {
        if (id === "latest") {
          if (note?.id) {
            await revisions.fetchLatest(note.id);
          }
        } else {
          await revisions.fetch(id);
        }
      } catch (err) {
        onError(err as Error);
      }
    },
    [revisions, note?.id]
  );
  React.useEffect(() => {
    if (revisionId) {
      void fetchRevisionById(revisionId, setError);
    }
  }, [fetchRevisionById, revisionId]);
  const compareTo = query.get("compareTo");
  React.useEffect(() => {
    if (compareTo) {
      void fetchRevisionById(compareTo, (err) =>
        Logger.error("Failed to fetch compareTo revision", err)
      );
    }
  }, [fetchRevisionById, compareTo]);
  React.useEffect(() => {
    async function fetchViews() {
      if (note?.id && !note?.isDeleted && !revisionId && !isJustCreated) {
        try {
          await views.fetchPage({
            noteId: note.id,
          });
        } catch (err) {
          Logger.error("Failed to fetch views", toError(err));
        }
      }
    }
    void fetchViews();
  }, [note?.id, note?.isDeleted, revisionId, views, isJustCreated]);
  const onCreateLink = React.useCallback(
    async (params: Properties<Note>, nested?: boolean) => {
      if (!note) {
        throw new Error("Note not loaded yet");
      }
      const newNote = await notes.create(
        {
          notebookId: nested ? undefined : note.notebookId,
          parentNoteId: nested ? note.id : note.parentNoteId,
          data: ProsemirrorDataHelper.getEmpty(),
          ...params,
        },
        {
          publish: note.isDraft ? undefined : true,
        }
      );
      return newNote.url;
    },
    [note, notes]
  );
  // Sets the current note as active in the sidebar. In a split view only
  // the focused pane's note is active, updated as focus moves between the
  // panes.
  React.useEffect(() => {
    if (note && isPaneFocused) {
      ui.setActiveNote(note);
    }
  }, [ui, note, isPaneFocused]);
  React.useEffect(() => {
    if (note) {
      // If we're attempting to update an archived, deleted, or otherwise
      // uneditable note then forward to the canonical read url.
      if (!missingPolicy && !can.update && isEditRoute) {
        history.push(note.url);
        return;
      }
      // Prevents unauthorized request to load share information for the note
      // when viewing a public share link
      if (can.read && !note.isDeleted && !revisionId) {
        if (team.commentingEnabled && !isJustCreated) {
          void comments.fetchAll({
            noteId: note.id,
            limit: 100,
            direction: "ASC",
          });
        }
        // A newly created note has no share of its own, though it can still inherit one
        // from a parent.
        if (!isJustCreated || note.parentNoteId) {
          shares.fetchOne({ noteId: note.id }).catch((err) => {
            if (!(err instanceof NotFoundError)) {
              throw err;
            }
          });
        }
      }
    }
  }, [
    can.read,
    can.update,
    note,
    isEditRoute,
    comments,
    team,
    shares,
    revisionId,
    missingPolicy,
    isJustCreated,
  ]);
  // Auto-enter presentation mode when ?present=true query param is set
  React.useEffect(() => {
    if (note && query.has("present") && !ui.presentationData) {
      ui.setPresentingNote(note);
    }
  }, [note, query, ui]);
  if (error) {
    return error instanceof OfflineError ? (
      <ErrorOffline />
    ) : error instanceof PaymentRequiredError ? (
      <Error402 />
    ) : error instanceof AuthorizationError ? (
      <Error403 noteId={noteSlug} />
    ) : error instanceof NotFoundError ? (
      <Error404 />
    ) : (
      <ErrorUnknown />
    );
  }
  if (can.read === false) {
    return <Error404 />;
  }
  if (!note || (revisionId && !revision)) {
    return (
      <>
        <Loading location={location} />
      </>
    );
  }
  const canonicalUrl = updateNotePath(match.url, note);
  const canEdit = can.update && !note.isArchived && !revisionId;
  const readOnly = !isEditing || !canEdit;
  return (
    <>
      {location.pathname !== canonicalUrl && (
        <Redirect
          to={{
            pathname: canonicalUrl,
            state: location.state,
            hash: location.hash,
          }}
        />
      )}
      {!revision && <MarkAsViewed note={note} />}
      <React.Fragment key={canEdit ? "edit" : "read"}>
        {children({
          note,
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
