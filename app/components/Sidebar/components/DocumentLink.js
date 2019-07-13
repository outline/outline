// @flow
import * as React from 'react';
import { observer } from 'mobx-react';
import { observable } from 'mobx';
import styled from 'styled-components';
import Document from 'models/Document';
import DocumentMenu from 'menus/DocumentMenu';
import SidebarLink from './SidebarLink';
import DropToImport from 'components/DropToImport';
import Fade from 'components/Fade';
import Collection from 'models/Collection';
import DocumentsStore from 'stores/DocumentsStore';
import Flex from 'shared/components/Flex';
import { type NavigationNode } from 'types';

type Props = {
  node: NavigationNode,
  documents: DocumentsStore,
  collection?: Collection,
  activeDocument: ?Document,
  activeDocumentRef?: (?HTMLElement) => *,
  prefetchDocument: (documentId: string) => Promise<void>,
  depth: number,
};

@observer
class DocumentLink extends React.Component<Props> {
  @observable menuOpen = false;

  handleMouseEnter = (ev: SyntheticEvent<*>) => {
    const { node, prefetchDocument } = this.props;

    ev.stopPropagation();
    ev.preventDefault();
    prefetchDocument(node.id);
  };

  render() {
    const {
      node,
      documents,
      collection,
      activeDocument,
      activeDocumentRef,
      prefetchDocument,
      depth,
    } = this.props;

    const isActiveDocument = activeDocument && activeDocument.id === node.id;
    const showChildren = !!(
      activeDocument &&
      collection &&
      (collection
        .pathToDocument(activeDocument)
        .map(entry => entry.id)
        .includes(node.id) ||
        isActiveDocument)
    );
    const hasChildren = !!node.children.length;
    const document = documents.get(node.id);

    return (
      <Flex
        column
        key={node.id}
        ref={isActiveDocument ? activeDocumentRef : undefined}
        onMouseEnter={this.handleMouseEnter}
      >
        <DropToImport documentId={node.id} activeClassName="activeDropZone">
          <SidebarLink
            to={{
              pathname: node.url,
              state: { title: node.title },
            }}
            expanded={showChildren}
            label={node.title}
            depth={depth}
            exact={false}
            menuOpen={this.menuOpen}
            menu={
              document ? (
                <Fade>
                  <DocumentMenu
                    position="left"
                    document={document}
                    onOpen={() => (this.menuOpen = true)}
                    onClose={() => (this.menuOpen = false)}
                  />
                </Fade>
              ) : (
                undefined
              )
            }
          >
            {hasChildren && (
              <DocumentChildren column>
                {node.children.map(childNode => (
                  <DocumentLink
                    key={childNode.id}
                    collection={collection}
                    node={childNode}
                    documents={documents}
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
