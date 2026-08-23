import { observer } from "mobx-react";
import { useEffect, useMemo, useRef } from "react";
import type { PublicTeam } from "@shared/types";
import { TOCPosition } from "@shared/types";
import type NoteModel from "~/models/Note";
import NoteComponent from "~/scenes/Note/components/Note";
import Branding from "~/components/Branding";
import { useNoteContext } from "~/components/NoteContext";
import { useTeamContext } from "~/components/TeamContext";
import useCurrentUser from "~/hooks/useCurrentUser";
import useQuery from "~/hooks/useQuery";
import useShare from "@shared/hooks/useShare";
import { parseDomain } from "@shared/utils/domains";
type Props = {
  note: NoteModel;
};
function SharedNote({ note }: Props) {
  const { shareId } = useShare();
  const query = useQuery();
  const searchTerm = query.get("q") || undefined;
  const team = useTeamContext() as PublicTeam | undefined;
  const user = useCurrentUser({ rejectOnEmpty: false });
  const { hasHeadings, setNote, isEditorInitialized, editor } =
    useNoteContext();
  const abilities = useMemo(() => ({}), []);
  const isCustomDomain = useMemo(
    () => parseDomain(window.location.origin).custom,
    []
  );
  const showBranding = !isCustomDomain && !user;
  const searchTermProcessed = useRef<string | null>(null);
  const tocPosition = hasHeadings
    ? (team?.tocPosition ?? TOCPosition.Left)
    : false;
  setNote(note);
  // Highlight search term when navigating from search results
  useEffect(() => {
    if (
      isEditorInitialized &&
      editor &&
      searchTerm &&
      searchTermProcessed.current !== searchTerm
    ) {
      searchTermProcessed.current = searchTerm;
      editor.commands.find({ text: searchTerm });
    }
  }, [isEditorInitialized, editor, searchTerm]);
  return (
    <>
      <NoteComponent
        abilities={abilities}
        note={note}
        shareId={shareId}
        tocPosition={tocPosition}
        readOnly
      />
      {showBranding ? (
        <Branding href="//www.getoutline.com?ref=sharelink" />
      ) : null}
    </>
  );
}
export const Note = observer(SharedNote);
