import * as React from "react";
import { StaticContext } from "react-router";
import { RouteComponentProps } from "react-router-dom";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import DataLoader from "./components/DataLoader";
import Document from "./components/Document";
import SocketPresence from "./components/SocketPresence";

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

type Props = RouteComponentProps<Params, StaticContext, LocationState>;

export default function DocumentScene(props: Props) {
  const { ui } = useStores();
  const team = useCurrentTeam();
  const { documentSlug, revisionId } = props.match.params;

  React.useEffect(() => {
    return () => ui.clearActiveDocument();
  }, [ui]);

  // the urlId portion of the url does not include the slugified title
  // we only want to force a re-mount of the document component when the
  // document changes, not when the title does so only this portion is used
  // for the key.
  const urlParts = documentSlug ? documentSlug.split("-") : [];
  const urlId = urlParts.length ? urlParts[urlParts.length - 1] : undefined;
  const key = [urlId, revisionId].join("/");
  const isMultiplayer = team.collaborativeEditing;

  return (
    <DataLoader
      key={key}
      match={props.match}
      history={props.history}
      location={props.location}
    >
      {({ document, isEditing, ...rest }) => {
        const isActive =
          !document.isArchived && !document.isDeleted && !revisionId;

        // TODO: Remove once multiplayer is 100% rollout, SocketPresence will
        // no longer be required
        if (isActive && !isMultiplayer) {
          return (
            <SocketPresence documentId={document.id} isEditing={isEditing}>
              <Document document={document} {...rest} />
            </SocketPresence>
          );
        }

        return <Document document={document} {...rest} />;
      }}
    </DataLoader>
  );
}
