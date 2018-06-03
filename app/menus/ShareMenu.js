// @flow
import * as React from 'react';
import { withRouter } from 'react-router-dom';
import { inject } from 'mobx-react';
import { MoreIcon } from 'outline-icons';

import type { Share } from 'types';
import CopyToClipboard from 'components/CopyToClipboard';
import SharesStore from 'stores/SharesStore';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

type Props = {
  label?: React.Node,
  onOpen?: () => *,
  onClose: () => *,
  history: Object,
  shares: SharesStore,
  share: Share,
};

class ShareMenu extends React.Component<Props> {
  onGoToDocument = (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    this.props.history.push(this.props.share.documentUrl);
  };

  onRevoke = (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    this.props.shares.revoke(this.props.share);
  };

  render() {
    const { share, label, onOpen, onClose } = this.props;

    return (
      <DropdownMenu
        label={label || <MoreIcon />}
        onOpen={onOpen}
        onClose={onClose}
      >
        <CopyToClipboard text={share.url} onCopy={onClose}>
          <DropdownMenuItem>Copy link</DropdownMenuItem>
        </CopyToClipboard>
        <DropdownMenuItem onClick={this.onGoToDocument}>
          Go to document
        </DropdownMenuItem>
        <hr />
        <DropdownMenuItem onClick={this.onRevoke}>Revoke link</DropdownMenuItem>
      </DropdownMenu>
    );
  }
}

export default withRouter(inject('shares')(ShareMenu));
