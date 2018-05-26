// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import SharesStore from 'stores/SharesStore';

import ShareListItem from './components/ShareListItem';
import List from 'components/List';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';

type Props = {
  shares: SharesStore,
};

@observer
class Shares extends React.Component<Props> {
  componentDidMount() {
    this.props.shares.fetchPage({ limit: 100 });
  }

  render() {
    const { shares } = this.props;

    return (
      <CenteredContent>
        <PageTitle title="Share Links" />
        <h1>Share Links</h1>
        <List>
          {shares.orderedData.map(share => (
            <ShareListItem key={share.id} share={share} />
          ))}
        </List>
      </CenteredContent>
    );
  }
}

export default inject('shares')(Shares);
