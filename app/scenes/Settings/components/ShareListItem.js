// @flow
import * as React from 'react';
import ShareMenu from 'menus/ShareMenu';
import ListItem from 'components/List/Item';
import Time from 'shared/components/Time';
import Share from 'models/Share';

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
          Shared <Time dateTime={share.createdAt} /> ago by{' '}
          {share.createdBy.name}
        </React.Fragment>
      }
      actions={<ShareMenu share={share} />}
    />
  );
};

export default ShareListItem;
