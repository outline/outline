// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import { withRouter, type Location } from 'react-router-dom';
import Fade from 'components/Fade';
import Tabs from 'components/Tabs';
import Tab from 'components/Tab';
import DocumentsStore from 'stores/DocumentsStore';
import CollectionsStore from 'stores/CollectionsStore';
import Document from 'models/Document';
import Backlink from './Backlink';

type Props = {
  document: Document,
  documents: DocumentsStore,
  collections: CollectionsStore,
  location: Location,
};

@observer
class Backlinks extends React.Component<Props> {
  componentDidMount() {
    this.props.documents.fetchBacklinks(this.props.document.id);
  }

  render() {
    const { documents, collections, document } = this.props;
    const backlinks = documents.getBacklinedDocuments(document.id);
    const collection = collections.get(document.collectionId);
    const children = collection
      ? collection.getDocumentChildren(document.id)
      : [];

    const showBacklinks = !!backlinks.length;
    const showChildren = !!children.length;
    const isReferences =
      this.props.location.hash === '#references' || !showChildren;

    return (
      (showBacklinks || showChildren) && (
        <Fade>
          <Tabs>
            {showChildren && (
              <Tab to="#children" isActive={() => !isReferences}>
                Child documents
              </Tab>
            )}
            {showBacklinks && (
              <Tab to="#references" isActive={() => isReferences}>
                References
              </Tab>
            )}
          </Tabs>
          {isReferences &&
            backlinks.map(backlinkedDocument => (
              <Backlink
                anchor={document.urlId}
                key={backlinkedDocument.id}
                document={backlinkedDocument}
                showCollection={
                  backlinkedDocument.collectionId !== document.collectionId
                }
              />
            ))}
          {!isReferences &&
            children.map(node => {
              const document = documents.get(node.id);
              return (
                <Backlink
                  key={node.id}
                  document={document || node}
                  showCollection={false}
                />
              );
            })}
        </Fade>
      )
    );
  }
}

export default withRouter(inject('documents', 'collections')(Backlinks));
