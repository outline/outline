// @flow
import * as React from 'react';
import { observer } from 'mobx-react';
import Fade from 'components/Fade';
import Subheading from 'components/Subheading';
import DocumentsStore from 'stores/DocumentsStore';
import Document from 'models/Document';
import Backlink from './Backlink';

type Props = {
  document: Document,
  documents: DocumentsStore,
};

@observer
class Backlinks extends React.Component<Props> {
  componentDidMount() {
    this.props.documents.fetchBacklinks(this.props.document.id);
  }

  render() {
    const { documents, document } = this.props;
    const backlinks = documents.getBacklinedDocuments(document.id);
    const showBacklinks = !!backlinks.length;

    return (
      showBacklinks && (
        <Fade>
          <Subheading>Referenced By</Subheading>
          {backlinks.map(backlinkedDocument => (
            <Backlink
              anchor={document.urlId}
              key={backlinkedDocument.id}
              document={backlinkedDocument}
              showCollection={
                backlinkedDocument.collectionId !== document.collectionId
              }
            />
          ))}
        </Fade>
      )
    );
  }
}

export default Backlinks;
