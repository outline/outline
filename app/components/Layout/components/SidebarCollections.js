// @flow
import React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import Flex from 'shared/components/Flex';
import styled from 'styled-components';
import { color, fontWeight } from 'shared/styles/constants';

import SidebarLink from './SidebarLink';
import DropToImport from 'components/DropToImport';
import PlusIcon from 'components/Icon/PlusIcon';
import CollectionIcon from 'components/Icon/CollectionIcon';
import CollectionMenu from 'menus/CollectionMenu';

import CollectionsStore from 'stores/CollectionsStore';
import UiStore from 'stores/UiStore';
import Document from 'models/Document';
import DocumentsStore from 'stores/DocumentsStore';
import { type NavigationNode } from 'types';

type Props = {
  history: Object,
  collections: CollectionsStore,
  documents: DocumentsStore,
  activeDocument: ?Document,
  onCreateCollection: () => void,
  activeDocumentRef: HTMLElement => void,
  ui: UiStore,
};

@observer class SidebarCollections extends React.PureComponent {
  props: Props;

  render() {
    const {
      history,
      collections,
      activeDocument,
      ui,
      activeDocumentRef,
      documents,
    } = this.props;

    return (
      <Flex column>
        <Header>Collections</Header>
        {collections.orderedData.map(collection => (
          <CollectionLink
            key={collection.id}
            history={history}
            collection={collection}
            activeDocument={activeDocument}
            activeDocumentRef={activeDocumentRef}
            prefetchDocument={documents.prefetchDocument}
            ui={ui}
          />
        ))}

        {collections.isLoaded &&
          <SidebarLink
            onClick={this.props.onCreateCollection}
            icon={<PlusIcon />}
          >
            New collection…
          </SidebarLink>}
      </Flex>
    );
  }
}

@observer class CollectionLink extends React.Component {
  dropzoneRef;

  @observable menuOpen = false;

  handleImport = () => {
    this.dropzoneRef.open();
  };

  render() {
    const {
      history,
      collection,
      activeDocument,
      ui,
      activeDocumentRef,
      prefetchDocument,
    } = this.props;
    const expanded = collection.id === ui.activeCollectionId;

    return (
      <StyledDropToImport
        key={collection.id}
        history={history}
        collectionId={collection.id}
        activeClassName="activeDropZone"
        menuOpen={this.menuOpen}
        dropzoneRef={ref => (this.dropzoneRef = ref)}
      >
        <SidebarLink
          key={collection.id}
          to={collection.url}
          icon={<CollectionIcon expanded={expanded} />}
        >
          <Flex justify="space-between">
            {collection.name}

            <CollectionAction>
              <CollectionMenu
                history={history}
                collection={collection}
                onOpen={() => (this.menuOpen = true)}
                onClose={() => (this.menuOpen = false)}
                onImport={this.handleImport}
                open={this.menuOpen}
              />
            </CollectionAction>
          </Flex>

          {expanded &&
            <Children column>
              {collection.documents.map(document => (
                <DocumentLink
                  key={document.id}
                  activeDocumentRef={activeDocumentRef}
                  history={history}
                  document={document}
                  activeDocument={activeDocument}
                  prefetchDocument={prefetchDocument}
                  depth={0}
                />
              ))}
            </Children>}
        </SidebarLink>
      </StyledDropToImport>
    );
  }
}

type DocumentLinkProps = {
  document: NavigationNode,
  history: Object,
  activeDocument: ?Document,
  activeDocumentRef: HTMLElement => void,
  prefetchDocument: (documentId: string) => void,
  depth: number,
};

const DocumentLink = observer(
  ({
    document,
    activeDocument,
    activeDocumentRef,
    prefetchDocument,
    depth,
  }: DocumentLinkProps) => {
    const isActiveDocument =
      activeDocument && activeDocument.id === document.id;
    const showChildren = !!(activeDocument &&
      (activeDocument.pathToDocument
        .map(entry => entry.id)
        .includes(document.id) ||
        isActiveDocument));

    const handleMouseEnter = (event: SyntheticEvent) => {
      event.stopPropagation();
      event.preventDefault();
      prefetchDocument(document.id);
    };

    return (
      <Flex
        column
        key={document.id}
        innerRef={isActiveDocument ? activeDocumentRef : undefined}
        onMouseEnter={handleMouseEnter}
      >
        <DropToImport
          history={history}
          documentId={document.id}
          activeStyle="activeDropZone"
        >
          <SidebarLink
            to={document.url}
            expand={showChildren}
            expandedContent={
              document.children.length
                ? <Children column>
                    {document.children.map(childDocument => (
                      <DocumentLink
                        key={childDocument.id}
                        history={history}
                        document={childDocument}
                        activeDocument={activeDocument}
                        prefetchDocument={prefetchDocument}
                        depth={depth + 1}
                      />
                    ))}
                  </Children>
                : undefined
            }
          >
            {document.title}
          </SidebarLink>
        </DropToImport>
      </Flex>
    );
  }
);

const CollectionAction = styled.a`
  position: absolute;
  right: 0;
  color: ${color.slate};
  svg { opacity: .75; }

  &:hover {
    svg { opacity: 1; }
  }
`;

const StyledDropToImport = styled(DropToImport)`
  ${CollectionAction} {
    display: ${props => (props.menuOpen ? 'inline' : 'none')};
  }

  &:hover {
    ${CollectionAction} {
      display: inline;
    }
  }
`;

const Header = styled(Flex)`
  font-size: 12px;
  font-weight: ${fontWeight.semiBold};
  text-transform: uppercase;
  color: ${color.slate};
  letter-spacing: 0.04em;
  margin-bottom: 4px;
`;

const Children = styled(Flex)`
  margin-left: 20px;
`;

export default inject('collections', 'ui', 'documents')(SidebarCollections);
