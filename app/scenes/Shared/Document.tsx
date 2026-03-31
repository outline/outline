import { observer } from "mobx-react";
import { useEffect, useMemo, useRef } from "react";
import type { PublicTeam } from "@shared/types";
import { TOCPosition } from "@shared/types";
import type DocumentModel from "~/models/Document";
import DocumentComponent from "~/scenes/Document/components/Document";
import Branding from "~/components/Branding";
import { useDocumentContext } from "~/components/DocumentContext";
import { useTeamContext } from "~/components/TeamContext";
import useCurrentUser from "~/hooks/useCurrentUser";
import useQuery from "~/hooks/useQuery";
import useShare from "@shared/hooks/useShare";
import { parseDomain } from "@shared/utils/domains";

type Props = {
  document: DocumentModel;
};

function SharedDocument({ document }: Props) {
  const { shareId } = useShare();
  const query = useQuery();
  const searchTerm = query.get("q") || undefined;
  const team = useTeamContext() as PublicTeam | undefined;
  const user = useCurrentUser({ rejectOnEmpty: false });
  const { hasHeadings, setDocument, isEditorInitialized, editor } =
    useDocumentContext();
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
  setDocument(document);

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
      <DocumentComponent
        abilities={abilities}
        document={document}
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

export const Document = observer(SharedDocument);
