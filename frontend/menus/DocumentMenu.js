// @flow
import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { inject, observer } from 'mobx-react';
import Document from 'models/Document';
import UiStore from 'stores/UiStore';
import Icon from 'components/Icon';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

@observer class DocumentMenu extends Component {
  props: {
    ui: UiStore,
    label?: React$Element<any>,
    history: Object,
    document: Document,
  };

  onCreateDocument = () => {
    this.props.history.push(`${this.props.document.collection.url}/new`);
  };

  onCreateChild = () => {
    this.props.history.push(`${this.props.document.url}/new`);
  };

  onDelete = () => {
    const { document } = this.props;
    this.props.ui.setActiveModal('document-delete', { document });
  };

  onExport = () => {
    this.props.document.download();
  };

  render() {
    const { document, label } = this.props;
    const { collection, allowDelete } = document;

    return (
      <DropdownMenu label={label || <Icon type="MoreHorizontal" />}>
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

export default withRouter(inject('ui')(DocumentMenu));
