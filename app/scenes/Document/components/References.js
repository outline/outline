// @flow
import { observer, inject } from "mobx-react";
import * as React from "react";
import { withRouter, type Location } from "react-router-dom";
import CollectionsStore from "stores/CollectionsStore";
import DocumentsStore from "stores/DocumentsStore";
import Document from "models/Document";
import Fade from "components/Fade";
import Tab from "components/Tab";
import Tabs from "components/Tabs";
import ReferenceListItem from "./ReferenceListItem";

type Props = {
  document: Document,
  documents: DocumentsStore,
  collections: CollectionsStore,
  location: Location,
};

@observer
class References extends React.Component<Props> {
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
    const isBacklinksTab =
      this.props.location.hash === "#backlinks" || !showChildren;

    return (
      (showBacklinks || showChildren) && (
        <Fade>
          <Tabs>
            {showChildren && (
              <Tab to="#children" isActive={() => !isBacklinksTab}>
                Nested documents
              </Tab>
            )}
            {showBacklinks && (
              <Tab to="#backlinks" isActive={() => isBacklinksTab}>
                Referenced by
              </Tab>
            )}
          </Tabs>
          {isBacklinksTab
            ? backlinks.map((backlinkedDocument) => (
                <ReferenceListItem
                  anchor={document.urlId}
                  key={backlinkedDocument.id}
                  document={backlinkedDocument}
                  showCollection={
                    backlinkedDocument.collectionId !== document.collectionId
                  }
                />
              ))
            : children.map((node) => {
                // If we have the document in the store already then use it to get the extra
                // contextual info, otherwise the collection node will do (only has title and id)
                const document = documents.get(node.id);
                return (
                  <ReferenceListItem
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

export default withRouter(inject("documents", "collections")(References));
