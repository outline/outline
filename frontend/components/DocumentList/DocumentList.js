// @flow
import React from 'react';
import type { Document } from 'types';
import DocumentPreview from 'components/DocumentPreview';

class DocumentList extends React.Component {
  props: {
    documents: Array<Document>,
  };

  render() {
    return (
      <div>
        {this.props.documents &&
          this.props.documents.map(document => (
            <DocumentPreview document={document} />
          ))}
      </div>
    );
  }
}

export default DocumentList;
