// @flow
import React from 'react';
import Document from 'models/Document';
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
            <DocumentPreview key={document.id} document={document} />
          ))}
      </div>
    );
  }
}

export default DocumentList;
