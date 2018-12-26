// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { createGlobalStyle } from 'styled-components';
import { omit } from 'lodash';
import invariant from 'invariant';
import importFile from 'utils/importFile';
import Dropzone from 'react-dropzone';
import DocumentsStore from 'stores/DocumentsStore';
import LoadingIndicator from 'components/LoadingIndicator';

type Props = {
  children: React.Node,
  collectionId: string,
  documentId?: string,
  activeClassName?: string,
  rejectClassName?: string,
  documents: DocumentsStore,
  disabled: boolean,
  history: Object,
};

const GlobalStyles = createGlobalStyle`
  .activeDropZone {
    background: ${props => props.theme.slateDark};
    svg { fill: ${props => props.theme.white}; }
  }

  .activeDropZone a {
    color: ${props => props.theme.white} !important;
  }
`;

@observer
class DropToImport extends React.Component<Props> {
  @observable isImporting: boolean = false;

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
        const doc = await importFile({
          documents: this.props.documents,
          file,
          documentId,
          collectionId,
        });

        if (redirect) {
          this.props.history.push(doc.url);
        }
      }
    } finally {
      this.isImporting = false;
    }
  };

  render() {
    const props = omit(
      this.props,
      'history',
      'documentId',
      'collectionId',
      'documents',
      'disabled',
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
        {...props}
      >
        <GlobalStyles />
        {this.isImporting && <LoadingIndicator />}
        {this.props.children}
      </Dropzone>
    );
  }
}

export default inject('documents')(DropToImport);
