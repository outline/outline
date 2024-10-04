import { observer } from "mobx-react";
import { DocumentIcon } from "outline-icons";
import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s, ellipsis } from "@shared/styles";
import { IconType, NavigationNode } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import Document from "~/models/Document";
import Flex from "~/components/Flex";
import Icon from "~/components/Icon";
import { hover } from "~/styles";
import { sharedDocumentPath } from "~/utils/routeHelpers";

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
  cursor: var(--pointer);

  &:${hover},
  &:active,
  &:focus {
    background: ${s("listItemHoverBackground")};
  }
`;

const Content = styled(Flex)`
  color: ${s("textSecondary")};
  margin-left: -4px;
`;

const Title = styled.div`
  ${ellipsis()}
  font-size: 14px;
  font-weight: 500;
  line-height: 1.25;
  padding-top: 3px;
  color: ${s("text")};
  font-family: ${s("fontFamily")};
`;

function ReferenceListItem({
  document,
  showCollection,
  anchor,
  shareId,
  ...rest
}: Props) {
  const { icon, color } = document;
  const isEmoji = determineIconType(icon) === IconType.Emoji;

  return (
    <DocumentLink
      to={{
        pathname: shareId
          ? sharedDocumentPath(shareId, document.url)
          : document.url,
        hash: anchor ? `d-${anchor}` : undefined,
        state: {
          title: document.title,
        },
      }}
      {...rest}
    >
      <Content gap={4} dir="auto">
        {icon ? (
          <Icon value={icon} color={color ?? undefined} />
        ) : (
          <DocumentIcon />
        )}
        <Title>
          {isEmoji ? document.title.replace(icon!, "") : document.title}
        </Title>
      </Content>
    </DocumentLink>
  );
}

export default observer(ReferenceListItem);
