import { observer } from "mobx-react";
import { DocumentIcon } from "outline-icons";
import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import Document from "~/models/Document";
import DocumentMeta from "~/components/DocumentMeta";
import Flex from "~/components/Flex";
import { hover } from "~/styles";
import { NavigationNode } from "~/types";

type Props = {
  shareId?: string;
  document: Document | NavigationNode;
  anchor?: string;
  showCollection?: boolean;
};

const DocumentLink = styled(Link)`
  display: block;
  margin: 2px -8px;
  padding: 6px 8px;
  border-radius: 8px;
  max-height: 50vh;
  min-width: 100%;
  overflow: hidden;
  position: relative;

  &:${hover},
  &:active,
  &:focus {
    background: ${(props) => props.theme.listItemHoverBackground};
  }
`;

const Title = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.25;
  padding-top: 3px;
  white-space: nowrap;
  color: ${(props) => props.theme.text};
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
`;

const StyledDocumentIcon = styled(DocumentIcon)`
  margin-left: -4px;
  color: ${(props) => props.theme.textSecondary};
  flex-shrink: 0;
`;

const Emoji = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: -4px;
  font-size: 16px;
  width: 24px;
  height: 24px;
`;

function ReferenceListItem({
  document,
  showCollection,
  anchor,
  shareId,
  ...rest
}: Props) {
  return (
    <DocumentLink
      to={{
        pathname: shareId ? `/share/${shareId}${document.url}` : document.url,
        hash: anchor ? `d-${anchor}` : undefined,
        state: {
          title: document.title,
        },
      }}
      {...rest}
    >
      <Flex gap={4} dir="auto">
        {document instanceof Document && document.emoji ? (
          <Emoji>{document.emoji}</Emoji>
        ) : (
          <StyledDocumentIcon color="currentColor" />
        )}
        <Title>
          {document instanceof Document && document.emoji
            ? document.title.replace(new RegExp(`^${document.emoji}`), "")
            : document.title}
        </Title>
      </Flex>
      {document instanceof Document && document.updatedBy && (
        <DocumentMeta document={document} showCollection={showCollection} />
      )}
    </DocumentLink>
  );
}

export default observer(ReferenceListItem);
