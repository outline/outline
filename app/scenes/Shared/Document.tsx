import { observer } from "mobx-react";
import { NavigationNode, PublicTeam, TOCPosition } from "@shared/types";
import DocumentModel from "~/models/Document";
import DocumentComponent from "~/scenes/Document/components/Document";
import { useDocumentContext } from "~/components/DocumentContext";
import { useTeamContext } from "~/components/TeamContext";
import { useMemo } from "react";
import { parseDomain } from "@shared/utils/domains";
import useCurrentUser from "~/hooks/useCurrentUser";
import Branding from "~/components/Branding";

type Props = {
  document: DocumentModel;
  shareId: string;
  sharedTree?: NavigationNode;
};

function SharedDocument({ document, shareId, sharedTree }: Props) {
  const team = useTeamContext() as PublicTeam | undefined;
  const user = useCurrentUser({ rejectOnEmpty: false });
  const { hasHeadings, setDocument } = useDocumentContext();
  const abilities = useMemo(() => ({}), []);
  const isCustomDomain = useMemo(
    () => parseDomain(window.location.origin).custom,
    []
  );
  const showBranding = !isCustomDomain && !user;

  const tocPosition = hasHeadings
    ? (team?.tocPosition ?? TOCPosition.Left)
    : false;
  setDocument(document);

  return (
    <>
      <DocumentComponent
        abilities={abilities}
        document={document}
        sharedTree={sharedTree}
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
