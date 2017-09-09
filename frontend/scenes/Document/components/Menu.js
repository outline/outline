// @flow
import React, { Component } from 'react';
import get from 'lodash/get';
import { withRouter } from 'react-router-dom';
import { observer } from 'mobx-react';
import Document from 'models/Document';
import Icon from 'components/Icon';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

type Props = {
  history: Object,
  document: Document,
};

@observer class Menu extends Component {
  props: Props;

  onCreateDocument = () => {
    this.props.history.push(`${this.props.document.collection.url}/new`);
  };

  onCreateChild = () => {
    this.props.history.push(`${this.props.document.url}/new`);
  };

  onDelete = async () => {
    let msg;
    if (get(this.props, 'document.collection.type') === 'atlas') {
      msg =
        "Are you sure you want to delete this document and all it's child documents (if any)?";
    } else {
      msg = 'Are you sure you want to delete this document?';
    }

    if (confirm(msg)) {
      await this.props.document.delete();
      this.props.history.push(this.props.document.collection.url);
    }
  };

  onExport = () => {
    this.props.document.download();
  };

  render() {
    const collection = this.props.document.collection;
    const allowDelete = this.props.document.allowDelete;

    return (
      <DropdownMenu label={<Icon type="MoreHorizontal" />} top right>
        {collection &&
          <DropdownMenuItem onClick={this.onCreateDocument}>
            New document
          </DropdownMenuItem>}
        <DropdownMenuItem onClick={this.onExport}>Export</DropdownMenuItem>
        {allowDelete &&
          <DropdownMenuItem onClick={this.onDelete}>Delete</DropdownMenuItem>}
      </DropdownMenu>
    );
  }
}

export default withRouter(Menu);
