import * as React from "react";
// @ts-expect-error ts-migrate(2724) FIXME: '"react-router-dom"' has no exported member named ... Remove this comment to see the full error message
import { Match } from "react-router-dom";
import "react-router-dom";
import DataLoader from "./components/DataLoader";
import Document from "./components/Document";
import SocketPresence from "./components/SocketPresence";
import useCurrentTeam from "hooks/useCurrentTeam";
import useCurrentUser from "hooks/useCurrentUser";
import useStores from "hooks/useStores";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'types' or its corresponding ty... Remove this comment to see the full error message
import { LocationWithState } from "types";
import "types";

type Props = {
  location: LocationWithState;
  match: Match;
};

export default function DocumentScene(props: Props) {
  const { ui } = useStores();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  React.useEffect(() => {
    return () => ui.clearActiveDocument();
  }, [ui]);
  const { documentSlug, revisionId } = props.match.params;
  // the urlId portion of the url does not include the slugified title
  // we only want to force a re-mount of the document component when the
  // document changes, not when the title does so only this portion is used
  // for the key.
  const urlParts = documentSlug ? documentSlug.split("-") : [];
  const urlId = urlParts.length ? urlParts[urlParts.length - 1] : undefined;
  const key = [urlId, revisionId].join("/");
  const isMultiplayer = team.collaborativeEditing;
  return (
    // @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: ({ document, isEditing, ...rest ... Remove this comment to see the full error message
    <DataLoader key={key} match={props.match}>
      {({ document, isEditing, ...rest }) => {
        const isActive =
          !document.isArchived && !document.isDeleted && !revisionId;

        // TODO: Remove once multiplayer is 100% rollout, SocketPresence will
        // no longer be required
        if (isActive && !isMultiplayer) {
          return (
            <SocketPresence
              documentId={document.id}
              // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
              userId={user.id}
              isEditing={isEditing}
            >
              <Document document={document} match={props.match} {...rest} />
            </SocketPresence>
          );
        }

        return <Document document={document} match={props.match} {...rest} />;
      }}
    </DataLoader>
  );
}
