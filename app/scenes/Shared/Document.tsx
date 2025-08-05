import { observer } from "mobx-react";
import { NavigationNode, PublicTeam, TOCPosition } from "@shared/types";
import DocumentModel from "~/models/Document";
import DocumentComponent from "~/scenes/Document/components/Document";
import { useDocumentContext } from "~/components/DocumentContext";
import { useTeamContext } from "~/components/TeamContext";
import { useMemo } from "react";

type Props = {
  document: DocumentModel;
  shareId: string;
  sharedTree?: NavigationNode;
};

function SharedDocument({ document, shareId, sharedTree }: Props) {
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
      sharedTree={sharedTree}
      shareId={shareId}
      tocPosition={tocPosition}
      readOnly
    />
  );
}

export const Document = observer(SharedDocument);
