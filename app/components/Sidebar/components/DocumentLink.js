// @flow
import * as React from 'react';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import Document from 'models/Document';
import SidebarLink from './SidebarLink';
import DropToImport from 'components/DropToImport';
import Collection from 'models/Collection';
import Flex from 'shared/components/Flex';
import { type NavigationNode } from 'types';

type Props = {
  document: NavigationNode,
  collection?: Collection,
  activeDocument: ?Document,
  activeDocumentRef?: (?HTMLElement) => *,
  prefetchDocument: (documentId: string) => Promise<void>,
  depth: number,
};

@observer
class DocumentLink extends React.Component<Props> {
  handleMouseEnter = (ev: SyntheticEvent<*>) => {
    const { document, prefetchDocument } = this.props;

    ev.stopPropagation();
    ev.preventDefault();
    prefetchDocument(document.id);
  };

  render() {
    const {
      document,
      collection,
      activeDocument,
      activeDocumentRef,
      prefetchDocument,
      depth,
    } = this.props;

    const isActiveDocument =
      activeDocument && activeDocument.id === document.id;
    const showChildren = !!(
      activeDocument &&
      collection &&
      (collection
        .pathToDocument(activeDocument)
        .map(entry => entry.id)
        .includes(document.id) ||
        isActiveDocument)
    );
    const hasChildren = !!document.children.length;

    return (
      <Flex
        column
        key={document.id}
        ref={isActiveDocument ? activeDocumentRef : undefined}
        onMouseEnter={this.handleMouseEnter}
      >
        <DropToImport documentId={document.id} activeClassName="activeDropZone">
          <SidebarLink
            to={{
              pathname: document.url,
              state: { title: document.title },
            }}
            expanded={showChildren}
            label={document.title}
            depth={depth}
            exact={false}
          >
            {hasChildren && (
              <DocumentChildren column>
                {document.children.map(childDocument => (
                  <DocumentLink
                    key={childDocument.id}
                    collection={collection}
                    document={childDocument}
                    activeDocument={activeDocument}
                    prefetchDocument={prefetchDocument}
                    depth={depth + 1}
                  />
                ))}
              </DocumentChildren>
            )}
          </SidebarLink>
        </DropToImport>
      </Flex>
    );
  }
}

const DocumentChildren = styled(Flex)``;

export default DocumentLink;
