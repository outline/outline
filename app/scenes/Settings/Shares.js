// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import { Link } from 'react-router-dom';
import SharesStore from 'stores/SharesStore';
import AuthStore from 'stores/AuthStore';

import ShareListItem from './components/ShareListItem';
import List from 'components/List';
import CenteredContent from 'components/CenteredContent';
import Subheading from 'components/Subheading';
import PageTitle from 'components/PageTitle';
import HelpText from 'components/HelpText';

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

    return (
      <CenteredContent>
        <PageTitle title="Share Links" />
        <h1>Share Links</h1>
        <HelpText>
          Documents that have been shared appear below. Anyone that has the link
          can access a read-only version of the document until the link has been
          revoked.
        </HelpText>
        {user &&
          user.isAdmin && (
            <HelpText>
              {!canShareDocuments && (
                <strong>Sharing is currently disabled.</strong>
              )}{' '}
              You can turn {canShareDocuments ? 'off' : 'on'} public document
              sharing in <Link to="/settings/security">security settings</Link>.
            </HelpText>
          )}
        <Subheading>Shared Documents</Subheading>
        <List>
          {shares.orderedData.map(share => (
            <ShareListItem key={share.id} share={share} />
          ))}
        </List>
      </CenteredContent>
    );
  }
}

export default inject('shares', 'auth')(Shares);
