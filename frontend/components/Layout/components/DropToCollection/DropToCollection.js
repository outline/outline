// @flow
import React, { Component } from 'react';
import { inject } from 'mobx-react';
import _ from 'lodash';
import Dropzone from 'react-dropzone';
import Document from 'models/Document';
import DocumentsStore from 'stores/DocumentsStore';

class DropToCollection extends Component {
  props: {
    children?: React$Element<any>,
    collectionId: string,
    documents: DocumentsStore,
    history: Object,
  };

  onDropAccepted = (files = []) => {
    const collectionId = this.props.collectionId;
    const redirect = files.length === 1;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = async ev => {
        const text = ev.target.result;
        let document = new Document({
          collection: { id: collectionId },
          text,
        });
        document = await document.save();
        this.props.documents.add(document);

        if (redirect) {
          this.props.history.push(document.url);
        }
      };
      reader.readAsText(file);
    });
  };

  render() {
    return (
      <Dropzone
        accept="text/markdown, text/plain"
        onDropAccepted={this.onDropAccepted}
        disableClick
        disablePreview
        multiple
      >
        {this.props.children}
      </Dropzone>
    );
  }
}

export default inject('documents')(DropToCollection);
