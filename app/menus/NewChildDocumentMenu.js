// @flow
import * as React from 'react';
import { withRouter } from 'react-router-dom';
import { MoreIcon } from 'outline-icons';

import { newDocumentUrl } from 'utils/routeHelpers';
import Document from 'models/Document';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

type Props = {
  label?: React.Node,
  history: Object,
  document: Document,
};

class NewChildDocumentMenu extends React.Component<Props> {
  handleNewDocument = () => {
    const { history, document } = this.props;
    history.push(newDocumentUrl(document.collection));
  };

  handleNewChild = () => {
    const { history, document } = this.props;
    history.push(
      `${document.collection.url}/new?parentDocument=${document.id}`
    );
  };

  render() {
    const { label, document, history, ...rest } = this.props;
    const { collection } = document;

    return (
      <DropdownMenu label={label || <MoreIcon />} {...rest}>
        <DropdownMenuItem onClick={this.handleNewChild}>
          New child document
        </DropdownMenuItem>
        <DropdownMenuItem onClick={this.handleNewDocument}>
          <span>
            New document in <strong>{collection.name}</strong>
          </span>
        </DropdownMenuItem>
      </DropdownMenu>
    );
  }
}

export default withRouter(NewChildDocumentMenu);
