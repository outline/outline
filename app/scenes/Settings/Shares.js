// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { Link } from "react-router-dom";
import CenteredContent from "components/CenteredContent";
import Empty from "components/Empty";
import HelpText from "components/HelpText";
import List from "components/List";
import PageTitle from "components/PageTitle";
import Subheading from "components/Subheading";
import ShareListItem from "./components/ShareListItem";
import useCurrentTeam from "hooks/useCurrentTeam";
import useStores from "hooks/useStores";

function Shares() {
  const team = useCurrentTeam();
  const { shares, auth, policies } = useStores();
  const canShareDocuments = auth.team && auth.team.sharing;
  const hasSharedDocuments = shares.orderedData.length > 0;
  const can = policies.abilities(team.id);

  React.useEffect(() => {
    shares.fetchPage({ limit: 100 });
  }, [shares]);

  return (
    <CenteredContent>
      <PageTitle title="Share Links" />
      <h1>Share Links</h1>
      <HelpText>
        Documents that have been shared are listed below. Anyone that has the
        public link can access a read-only version of the document until the
        link has been revoked.
      </HelpText>
      {can.manage && (
        <HelpText>
          {!canShareDocuments && (
            <strong>Sharing is currently disabled.</strong>
          )}{" "}
          You can turn {canShareDocuments ? "off" : "on"} public document
          sharing in <Link to="/settings/security">security settings</Link>.
        </HelpText>
      )}
      <Subheading>Shared Documents</Subheading>
      {hasSharedDocuments ? (
        <List>
          {shares.published.map((share) => (
            <ShareListItem key={share.id} share={share} />
          ))}
        </List>
      ) : (
        <Empty>No share links, yet.</Empty>
      )}
    </CenteredContent>
  );
}

export default observer(Shares);
