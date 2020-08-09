// @flow
import { observer, inject } from "mobx-react";
import * as React from "react";
import { Link } from "react-router-dom";
import AuthStore from "stores/AuthStore";
import SharesStore from "stores/SharesStore";

import CenteredContent from "components/CenteredContent";
import Empty from "components/Empty";
import HelpText from "components/HelpText";
import List from "components/List";
import PageTitle from "components/PageTitle";
import Subheading from "components/Subheading";
import ShareListItem from "./components/ShareListItem";

type Props = {
  shares: SharesStore,
  auth: AuthStore,
};

@observer
class Shares extends React.Component<Props> {
  componentDidMount() {
    this.props.shares.fetchPage({ limit: 100 });
  }

  render() {
    const { shares, auth } = this.props;
    const { user } = auth;
    const canShareDocuments = auth.team && auth.team.sharing;
    const hasSharedDocuments = shares.orderedData.length > 0;

    return (
      <CenteredContent>
        <PageTitle title="Share Links" />
        <h1>Share Links</h1>
        <HelpText>
          Documents that have been shared are listed below. Anyone that has the
          public link can access a read-only version of the document until the
          link has been revoked.
        </HelpText>
        {user && user.isAdmin && (
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
}

export default inject("shares", "auth")(Shares);
