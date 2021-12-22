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
};

function DocumentCard(props: Props, ref: React.RefObject<HTMLAnchorElement>) {
  const { collections } = useStores();
  const { document } = props;
  const collection = collections.get(document.collectionId);

  return (
    <DocumentLink
      ref={ref}
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
  );
}

const Content = styled(Flex)`
  min-width: 0;
  height: 100%;
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
}>`
  position: relative;
  display: block;
  padding: 12px;
  border-radius: 8px;
  height: 160px;
  background: ${(props) => props.theme.listItemHoverBackground};
  color: ${(props) => props.theme.white};
  transition: transform 50ms ease-in-out;

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
    background: ${(props) => props.theme.listItemHoverBackground};
    transform: scale(1.02);

    ${Actions} {
      opacity: 1;
    }
  }

  &:active {
    transform: scale(1);
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

const Heading = styled.h3<{ rtl?: boolean }>`
  margin-top: 0;
  margin-bottom: 0.35em;
  line-height: 22px;
  max-height: 52px;
  overflow: hidden;

  color: ${(props) => props.theme.white};
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
`;

export default observer(React.forwardRef(DocumentCard));
