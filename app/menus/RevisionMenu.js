// @flow
import * as React from 'react';
import { withRouter, type RouterHistory } from 'react-router-dom';
import { inject } from 'mobx-react';

import CopyToClipboard from 'components/CopyToClipboard';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';
import { documentHistoryUrl } from 'utils/routeHelpers';
import Revision from 'models/Revision';
import Document from 'models/Document';
import UiStore from 'stores/UiStore';

type Props = {
  onOpen?: () => void,
  onClose: () => void,
  history: RouterHistory,
  document: Document,
  revision: Revision,
  className?: string,
  label: React.Node,
  ui: UiStore,
};

class RevisionMenu extends React.Component<Props> {
  handleRestore = async (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    await this.props.document.restore(this.props.revision);
    this.props.ui.showToast('Document restored');
    this.props.history.push(this.props.document.url);
  };

  handleCopy = () => {
    this.props.ui.showToast('Link copied');
  };

  render() {
    const { className, label, onOpen, onClose } = this.props;
    const url = `${window.location.origin}${documentHistoryUrl(
      this.props.document,
      this.props.revision.id
    )}`;

    return (
      <DropdownMenu
        onOpen={onOpen}
        onClose={onClose}
        className={className}
        label={label}
      >
        <DropdownMenuItem onClick={this.handleRestore}>
          Restore version
        </DropdownMenuItem>
        <hr />
        <CopyToClipboard text={url} onCopy={this.handleCopy}>
          <DropdownMenuItem>Copy link</DropdownMenuItem>
        </CopyToClipboard>
      </DropdownMenu>
    );
  }
}

export default withRouter(inject('ui')(RevisionMenu));
