// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Redirect } from 'react-router-dom';
import { createGlobalStyle } from 'styled-components';
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
};

export const GlobalStyles = createGlobalStyle`
  .activeDropZone {
    border-radius: 4px;
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
  @observable redirectTo: ?string;

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
          this.redirectTo = doc.url;
        }
      }
    } finally {
      this.isImporting = false;
    }
  };

  render() {
    const {
      documentId,
      collectionId,
      documents,
      disabled,
      ...rest
    } = this.props;

    if (this.redirectTo) return <Redirect to={this.redirectTo} />;
    if (this.props.disabled) return this.props.children;

    return (
      <Dropzone
        accept="text/markdown, text/plain"
        onDropAccepted={this.onDropAccepted}
        style={{}}
        disableClick
        disablePreview
        multiple
        {...rest}
      >
        {this.isImporting && <LoadingIndicator />}
        {this.props.children}
      </Dropzone>
    );
  }
}

export default inject('documents')(DropToImport);
