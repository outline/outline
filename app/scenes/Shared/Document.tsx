import { observer } from "mobx-react";
import type { PublicTeam } from "@shared/types";
import { TOCPosition } from "@shared/types";
import type DocumentModel from "~/models/Document";
import DocumentComponent from "~/scenes/Document/components/Document";
import { useDocumentContext } from "~/components/DocumentContext";
import { useTeamContext } from "~/components/TeamContext";
import { useMemo } from "react";
import useShare from "@shared/hooks/useShare";

type Props = {
  document: DocumentModel;
};

function SharedDocument({ document }: Props) {
  const { shareId } = useShare();
  const team = useTeamContext() as PublicTeam | undefined;
  const { hasHeadings, setDocument } = useDocumentContext();
  const abilities = useMemo(() => ({}), []);
  const tocPosition = hasHeadings
    ? (team?.tocPosition ?? TOCPosition.Left)
    : false;
  setDocument(document);

  return (
    <DocumentComponent
      abilities={abilities}
      document={document}
      shareId={shareId}
      tocPosition={tocPosition}
      readOnly
    />
  );
}

export const Document = observer(SharedDocument);
