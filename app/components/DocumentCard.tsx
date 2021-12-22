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
import Highlight from "~/components/Highlight";
import StarButton, { AnimatedStar } from "~/components/Star";
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
  const canStar =
    !document.isDraft && !document.isArchived && !document.isTemplate;

  return (
    <Card>
      <DocumentLink
        ref={ref}
        dir={document.dir}
        $isStarred={document.isStarred}
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
            <Heading dir={document.dir}>
              {document.titleWithDefault}
              {canStar && (
                <StarPositioner>
                  <StarButton document={document} />
                </StarPositioner>
              )}
            </Heading>

            <StyledDocumentMeta document={document} />
          </div>
        </Content>
      </DocumentLink>
    </Card>
  );
}

const Card = styled.div``;

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
  $isStarred?: boolean;
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

  ${breakpoint("tablet")`
    width: auto;
  `};

  ${Actions} {
    opacity: 0;
  }

  ${AnimatedStar} {
    opacity: ${(props) => (props.$isStarred ? "1 !important" : 0)};
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

    ${AnimatedStar} {
      opacity: 0.5;

      &:hover {
        opacity: 1;
      }
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

      ${AnimatedStar} {
        opacity: 0.5;
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

const StarPositioner = styled(Flex)`
  display: inline-flex;
  margin-left: 4px;
  align-items: center;
  position: relative;
  top: 4px;
`;

export default observer(React.forwardRef(DocumentCard));
