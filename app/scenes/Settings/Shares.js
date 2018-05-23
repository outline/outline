// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import SharesStore from 'stores/SharesStore';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';

import CopyToClipboard from 'components/CopyToClipboard';
import Button from 'components/Button';
import List from 'components/List';
import ListItem from 'components/List/Item';
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
          {shares.data.map(share => (
            <ListItem
              key={share.id}
              title={share.documentTitle}
              subtitle={
                <React.Fragment>
                  Created{' '}
                  <time dateTime={share.createdAt}>
                    {distanceInWordsToNow(new Date(share.createdAt))}
                  </time>{' '}
                  ago by {share.createdBy.name}
                </React.Fragment>
              }
              actions={
                <React.Fragment>
                  <CopyToClipboard text={share.url}>
                    <Button type="submit" light>
                      Copy Link
                    </Button>
                  </CopyToClipboard>{' '}
                  <Button light>Revoke</Button>
                </React.Fragment>
              }
            />
          ))}
        </List>
      </CenteredContent>
    );
  }
}

export default inject('shares')(Shares);
