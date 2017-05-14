// @flow
import React, { Component } from 'react';
import invariant from 'invariant';
import get from 'lodash/get';
import { browserHistory } from 'react-router';
import { observer } from 'mobx-react';
import type { Document as DocumentType } from 'types';
import DropdownMenu, { MenuItem, MoreIcon } from 'components/DropdownMenu';
import DocumentStore from '../DocumentStore';

type Props = {
  document: DocumentType,
  collectionTree: ?Object,
  store: DocumentStore,
};

@observer class Menu extends Component {
  props: Props;

  onCreateDocument = () => {
    invariant(this.props.collectionTree, 'collectionTree is not available');
    browserHistory.push(`${this.props.collectionTree.url}/new`);
  };

  onCreateChild = () => {
    invariant(this.props.document, 'Document is not available');
    browserHistory.push(`${this.props.document.url}/new`);
  };

  onDelete = () => {
    let msg;
    if (get(this.props, 'document.collection.type') === 'atlas') {
      msg =
        "Are you sure you want to delete this document and all it's child documents (if any)?";
    } else {
      msg = 'Are you sure you want to delete this document?';
    }

    if (confirm(msg)) {
      this.props.store.deleteDocument();
    }
  };

  onExport = () => {
    const doc = this.props.document;
    if (doc) {
      const a = document.createElement('a');
      a.textContent = 'download';
      a.download = `${doc.title}.md`;
      a.href = `data:text/markdown;charset=UTF-8,${encodeURIComponent(doc.text)}`;
      a.click();
    }
  };

  render() {
    const document = get(this.props, 'document');
    const collection = get(document, 'collection.type') === 'atlas';
    const allowDelete =
      collection &&
      document.id !== get(document, 'collection.navigationTree.id');

    return (
      <DropdownMenu label={<MoreIcon />}>
        {collection &&
          <div>
            <MenuItem onClick={this.onCreateDocument}>
              New document
            </MenuItem>
            <MenuItem onClick={this.onCreateChild}>New child</MenuItem>
          </div>}
        <MenuItem onClick={this.onExport}>Export</MenuItem>
        {allowDelete && <MenuItem onClick={this.onDelete}>Delete</MenuItem>}
      </DropdownMenu>
    );
  }
}

export default Menu;
