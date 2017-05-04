// @flow
import React from 'react';
import type { Document } from 'types';
import DocumentPreview from 'components/DocumentPreview';
import Divider from 'components/Divider';

class DocumentList extends React.Component {
  props: {
    documents: Array<Document>,
  };

  render() {
    return (
      <div>
        {this.props.documents &&
          this.props.documents.map(document => (
            <div>
              <DocumentPreview document={document} />
              <Divider />
            </div>
          ))}
      </div>
    );
  }
}

export default DocumentList;
