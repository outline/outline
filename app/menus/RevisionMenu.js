// @flow
import * as React from 'react';
import { withRouter } from 'react-router-dom';
import { inject } from 'mobx-react';
import { MoreIcon } from 'outline-icons';

import CopyToClipboard from 'components/CopyToClipboard';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';
import { documentHistoryUrl } from 'utils/routeHelpers';
import type { Revision } from 'types';
import Document from 'models/Document';
import UiStore from 'stores/UiStore';

type Props = {
  label?: React.Node,
  onOpen?: () => *,
  onClose: () => *,
  history: Object,
  document: Document,
  revision: Revision,
  className?: string,
  ui: UiStore,
};

class RevisionMenu extends React.Component<Props> {
  handleRestore = async (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    await this.props.document.restore(this.props.revision);
    this.props.ui.showToast('Document restored', 'success');
    this.props.history.push(this.props.document.url);
  };

  handleCopy = () => {
    this.props.ui.showToast('Link copied', 'success');
  };

  render() {
    const { label, className, onOpen, onClose } = this.props;
    const url = `${window.location.origin}${documentHistoryUrl(
      this.props.document,
      this.props.revision.id
    )}`;

    return (
      <DropdownMenu
        label={label || <MoreIcon />}
        onOpen={onOpen}
        onClose={onClose}
        className={className}
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
