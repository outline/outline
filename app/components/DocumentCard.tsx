import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { observer } from "mobx-react";
import { DocumentIcon } from "outline-icons";
import { transparentize } from "polished";
import * as React from "react";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Document from "~/models/Document";
import DocumentMeta from "~/components/DocumentMeta";
import EventBoundary from "~/components/EventBoundary";
import Flex from "~/components/Flex";
import useStores from "~/hooks/useStores";
import CollectionIcon from "./CollectionIcon";

type Props = {
  document: Document;
  context?: string | undefined;
  showCollectionIcon?: boolean;
  canUpdate?: boolean;
};

function DocumentCard(props: Props) {
  const { collections } = useStores();
  const { document, canUpdate } = props;
  const collection = collections.get(document.collectionId);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.document.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Reorderable
      ref={setNodeRef}
      style={style}
      $isDragging={isDragging}
      {...attributes}
    >
      <DocumentLink
        dir={document.dir}
        style={{ background: collection?.color }}
        to={{
          pathname: document.url,
          state: {
            title: document.titleWithDefault,
          },
        }}
      >
        <Content justify="space-between" column>
          {collection?.icon &&
          collection?.icon !== "collection" &&
          props.showCollectionIcon ? (
            <CollectionIcon collection={collection} color="white" />
          ) : (
            <DocumentIcon color="white" />
          )}
          <div>
            <Heading dir={document.dir}>{document.titleWithDefault}</Heading>

            <StyledDocumentMeta document={document} />
          </div>
        </Content>
      </DocumentLink>
      {canUpdate && (
        <DragHandle dir={document.dir} $isDragging={isDragging} {...listeners}>
          :::
        </DragHandle>
      )}
    </Reorderable>
  );
}

const DragHandle = styled.div<{ dir: string; $isDragging: boolean }>`
  position: absolute;
  top: 12px;
  right: ${(props) => (props.dir === "rtl" ? "auto" : "12px")};
  left: ${(props) => (props.dir === "rtl" ? "12px" : "auto")};
  cursor: ${(props) => (props.$isDragging ? "grabbing" : "grab")};
  opacity: 0;
  transition: opacity 100ms ease-in-out;
  padding: 0 4px;
  font-weight: bold;
  color: ${(props) => props.theme.white75};

  // move drag handle above content
  z-index: 2;

  &:hover,
  &:active {
    color: ${(props) => props.theme.white};
  }
`;

const Reorderable = styled.div<{ $isDragging: boolean }>`
  position: relative;
  user-select: none;
  border-radius: 8px;

  // move above other cards when dragging
  z-index: ${(props) => (props.$isDragging ? 1 : "inherit")};
  transform: scale(${(props) => (props.$isDragging ? "1.025" : "1")});
  box-shadow: ${(props) =>
    props.$isDragging ? "0 0 20px rgba(0,0,0,0.3);" : "0 0 0 rgba(0,0,0,0)"};

  &:hover ${DragHandle} {
    opacity: 1;
  }
`;

const Content = styled(Flex)`
  min-width: 0;
  height: 100%;

  // move content above ::after
  position: relative;
  z-index: 1;
`;

const Actions = styled(EventBoundary)`
  display: none;
  align-items: center;
  margin: 8px;
  flex-shrink: 0;
  flex-grow: 0;

  ${breakpoint("tablet")`
    display: flex;
  `};
`;

const StyledDocumentMeta = styled(DocumentMeta)`
  color: ${(props) => transparentize(0.25, props.theme.white)} !important;
`;

const DocumentLink = styled(Link)<{
  $menuOpen?: boolean;
  $isDragging?: boolean;
}>`
  position: relative;
  display: block;
  padding: 12px;
  border-radius: 8px;
  height: 160px;
  background: ${(props) => props.theme.listItemHoverBackground};
  color: ${(props) => props.theme.white};
  transition: transform 50ms ease-in-out;
  opacity: ${(props) => (props.$isDragging ? 0.5 : 1)};

  &:after {
    content: "";
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.1));
    border-radius: 8px;
    pointer-events: none;
  }

  ${Actions} {
    opacity: 0;
  }

  &:hover,
  &:active,
  &:focus,
  &:focus-within {
    ${Actions} {
      opacity: 1;
    }

    &:after {
      background: rgba(0, 0, 0, 0.1);
    }
  }

  ${(props) =>
    props.$menuOpen &&
    css`
      background: ${(props) => props.theme.listItemHoverBackground};

      ${Actions} {
        opacity: 1;
      }
    `}
`;

const Heading = styled.h3`
  margin-top: 0;
  margin-bottom: 0.35em;
  line-height: 22px;
  max-height: 44px;
  overflow: hidden;

  color: ${(props) => props.theme.white};
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
`;

export default observer(DocumentCard);
