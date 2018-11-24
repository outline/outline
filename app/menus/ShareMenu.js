// @flow
import * as React from 'react';
import { withRouter } from 'react-router-dom';
import { inject } from 'mobx-react';
import { MoreIcon } from 'outline-icons';

import CopyToClipboard from 'components/CopyToClipboard';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

import SharesStore from 'stores/SharesStore';
import UiStore from 'stores/UiStore';
import Share from 'models/Share';

type Props = {
  label?: React.Node,
  onOpen?: () => *,
  onClose: () => *,
  history: Object,
  shares: SharesStore,
  ui: UiStore,
  share: Share,
};

class ShareMenu extends React.Component<Props> {
  handleGoToDocument = (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    this.props.history.push(this.props.share.documentUrl);
  };

  handleRevoke = (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    this.props.shares.revoke(this.props.share);
    this.props.ui.showToast('Share link revoked', 'success');
  };

  handleCopy = () => {
    this.props.ui.showToast('Share link copied', 'success');
  };

  render() {
    const { share, label, onOpen, onClose } = this.props;

    return (
      <DropdownMenu
        label={label || <MoreIcon />}
        onOpen={onOpen}
        onClose={onClose}
      >
        <CopyToClipboard text={share.url} onCopy={this.handleCopy}>
          <DropdownMenuItem>Copy link</DropdownMenuItem>
        </CopyToClipboard>
        <DropdownMenuItem onClick={this.handleGoToDocument}>
          Go to document
        </DropdownMenuItem>
        <hr />
        <DropdownMenuItem onClick={this.handleRevoke}>
          Revoke link
        </DropdownMenuItem>
      </DropdownMenu>
    );
  }
}

export default withRouter(inject('shares', 'ui')(ShareMenu));
