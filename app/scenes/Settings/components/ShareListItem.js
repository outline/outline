// @flow
import * as React from 'react';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import ShareMenu from 'menus/ShareMenu';
import ListItem from 'components/List/Item';
import type { Share } from '../../../types';

type Props = {
  share: Share,
};

const ShareListItem = ({ share }: Props) => {
  return (
    <ListItem
      key={share.id}
      title={share.documentTitle}
      subtitle={
        <React.Fragment>
          Shared{' '}
          <time dateTime={share.createdAt}>
            {distanceInWordsToNow(new Date(share.createdAt))}
          </time>{' '}
          ago by {share.createdBy.name}
        </React.Fragment>
      }
      actions={<ShareMenu share={share} />}
    />
  );
};

export default ShareListItem;
