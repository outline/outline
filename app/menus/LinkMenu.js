// @flow
import * as React from 'react';
import { inject } from 'mobx-react';
import { MoreIcon } from 'outline-icons';

import CopyToClipboard from 'components/CopyToClipboard';
import UiStore from 'stores/UiStore';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

type Props = {
  url: string,
  label?: React.Node,
  onOpen?: () => *,
  onClose: () => *,
  ui: UiStore,
};

class LinkMenu extends React.Component<Props> {
  handleEmbed = () => {
    // TODO
  };

  handleCopy = () => {
    this.props.ui.showToast('Share link copied', 'success');
  };

  render() {
    const { url, label, onOpen, onClose } = this.props;

    return (
      <DropdownMenu
        label={label || <MoreIcon />}
        onOpen={onOpen}
        onClose={onClose}
        inline
      >
        <DropdownMenuItem onClick={this.handleEmbed}>Embed</DropdownMenuItem>
        <CopyToClipboard text={url} onCopy={this.handleCopy}>
          <DropdownMenuItem>Copy link</DropdownMenuItem>
        </CopyToClipboard>
      </DropdownMenu>
    );
  }
}

export default inject('ui')(LinkMenu);
