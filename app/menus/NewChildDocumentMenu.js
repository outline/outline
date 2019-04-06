// @flow
import * as React from 'react';
import { Redirect } from 'react-router-dom';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { MoreIcon } from 'outline-icons';

import { newDocumentUrl } from 'utils/routeHelpers';
import Document from 'models/Document';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

type Props = {
  label?: React.Node,
  document: Document,
};

@observer
class NewChildDocumentMenu extends React.Component<Props> {
  @observable redirectTo: ?string;

  componentDidUpdate() {
    this.redirectTo = undefined;
  }

  handleNewDocument = () => {
    this.redirectTo = newDocumentUrl(this.props.document.collection);
  };

  handleNewChild = () => {
    const { document } = this.props;
    this.redirectTo = `${document.collection.url}/new?parentDocument=${
      document.id
    }`;
  };

  render() {
    if (this.redirectTo) return <Redirect to={this.redirectTo} push />;

    const { label, document, ...rest } = this.props;
    const { collection } = document;

    return (
      <DropdownMenu label={label || <MoreIcon />} {...rest}>
        <DropdownMenuItem onClick={this.handleNewDocument}>
          <span>
            New document in <strong>{collection.name}</strong>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={this.handleNewChild}>
          New child document
        </DropdownMenuItem>
      </DropdownMenu>
    );
  }
}

export default NewChildDocumentMenu;
