// @flow
import React, { Component } from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { injectGlobal } from 'styled-components';
import { color } from 'shared/styles/constants';
import invariant from 'invariant';
import _ from 'lodash';
import Dropzone from 'react-dropzone';
import Document from 'models/Document';
import DocumentsStore from 'stores/DocumentsStore';
import LoadingIndicator from 'components/LoadingIndicator';

type Props = {
  children?: React$Element<any>,
  collectionId: string,
  documentId?: string,
  activeClassName?: string,
  rejectClassName?: string,
  documents: DocumentsStore,
  disabled: boolean,
  dropzoneRef: Function,
  history: Object,
};

// eslint-disable-next-line
injectGlobal`
  .activeDropZone {
    background: ${color.slateDark};
    svg { fill: ${color.white}; }
  }

  .activeDropZone a {
    color: ${color.white} !important;
  }
`;

@observer
class DropToImport extends Component {
  @observable isImporting: boolean = false;
  props: Props;

  importFile = async ({ file, documentId, collectionId, redirect }) => {
    const reader = new FileReader();

    reader.onload = async ev => {
      const text = ev.target.result;
      let data = {
        parentDocument: undefined,
        collection: { id: collectionId },
        text,
      };

      if (documentId) data.parentDocument = documentId;

      let document = new Document(data);
      document = await document.save();
      this.props.documents.add(document);

      if (redirect && this.props.history) {
        this.props.history.push(document.url);
      }
    };
    reader.readAsText(file);
  };

  onDropAccepted = async (files = []) => {
    this.isImporting = true;

    try {
      let collectionId = this.props.collectionId;
      const documentId = this.props.documentId;
      const redirect = files.length === 1;

      if (documentId && !collectionId) {
        const document = await this.props.documents.fetch(documentId);
        invariant(document, 'Document not available');
        collectionId = document.collection.id;
      }

      for (const file of files) {
        await this.importFile({ file, documentId, collectionId, redirect });
      }
    } catch (err) {
      // TODO: show error alert.
    } finally {
      this.isImporting = false;
    }
  };

  render() {
    const props = _.omit(
      this.props,
      'history',
      'documentId',
      'collectionId',
      'documents',
      'disabled',
      'dropzoneRef',
      'menuOpen'
    );

    if (this.props.disabled) return this.props.children;

    return (
      <Dropzone
        accept="text/markdown, text/plain"
        onDropAccepted={this.onDropAccepted}
        style={{}}
        disableClick
        disablePreview
        multiple
        ref={this.props.dropzoneRef}
        {...props}
      >
        {this.isImporting && <LoadingIndicator />}
        {this.props.children}
      </Dropzone>
    );
  }
}

export default inject('documents')(DropToImport);
