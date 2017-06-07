// @flow
import React, { Component } from 'react';
import invariant from 'invariant';
import get from 'lodash/get';
import { withRouter } from 'react-router-dom';
import { observer } from 'mobx-react';
import type { Document as DocumentType } from 'types';
import DropdownMenu, { MenuItem, MoreIcon } from 'components/DropdownMenu';
import DocumentStore from '../DocumentStore';

type Props = {
  history: Object,
  document: DocumentType,
  store: DocumentStore,
};

@observer class Menu extends Component {
  props: Props;

  onCreateDocument = () => {
    // Disabled until created a better API
    // invariant(this.props.collectionTree, 'collectionTree is not available');
    // this.props.history.push(`${this.props.collectionTree.url}/new`);
  };

  onCreateChild = () => {
    invariant(this.props.document, 'Document is not available');
    this.props.history.push(`${this.props.document.url}/new`);
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
    if (document) {
      const collection = document.collection;
      const allowDelete =
        collection &&
        collection.type === 'atlas' &&
        collection.documents &&
        collection.documents.length > 1;

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
    return null;
  }
}

export default withRouter(Menu);
