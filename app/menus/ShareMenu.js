// @flow
import * as React from 'react';
import { Redirect } from 'react-router-dom';
import { inject, observer } from 'mobx-react';
import { observable } from 'mobx';

import CopyToClipboard from 'components/CopyToClipboard';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';
import SharesStore from 'stores/SharesStore';
import UiStore from 'stores/UiStore';
import Share from 'models/Share';

type Props = {
  onOpen?: () => void,
  onClose: () => void,
  shares: SharesStore,
  ui: UiStore,
  share: Share,
};

@observer
class ShareMenu extends React.Component<Props> {
  @observable redirectTo: ?string;

  componentDidUpdate() {
    this.redirectTo = undefined;
  }

  handleGoToDocument = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.redirectTo = this.props.share.documentUrl;
  };

  handleRevoke = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.props.shares.revoke(this.props.share);
    this.props.ui.showToast('Share link revoked');
  };

  handleCopy = () => {
    this.props.ui.showToast('Share link copied');
  };

  render() {
    if (this.redirectTo) return <Redirect to={this.redirectTo} push />;

    const { share, onOpen, onClose } = this.props;

    return (
      <DropdownMenu onOpen={onOpen} onClose={onClose}>
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

export default inject('shares', 'ui')(ShareMenu);
