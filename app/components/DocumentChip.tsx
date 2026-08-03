import { observer } from "mobx-react";
import { DocumentIcon } from "outline-icons";
import { Link } from "react-router-dom";
import styled from "styled-components";
import Icon from "@shared/components/Icon";
import { s, hover, ellipsis } from "@shared/styles";
import { IconType } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import type Document from "~/models/Document";

type Props = {
  /** The document to display */
  document: Document;
};

/**
 * A compact, single line representation of a document displaying its icon and
 * title, linking to the document.
 */
export const DocumentChip = observer(function DocumentChip_({
  document,
}: Props) {
  const { icon, color } = document;
  const title = document.titleWithDefault;
  const isEmoji = determineIconType(icon) === IconType.Emoji;

  return (
    <Chip
      dir={document.dir}
      to={{
        pathname: document.path,
        state: {
          title,
        },
      }}
    >
      {icon ? (
        <Icon
          value={icon}
          color={color ?? undefined}
          initial={document.initial}
        />
      ) : (
        <DocumentIcon />
      )}
      <Title>{isEmoji ? title.replace(icon!, "") : title}</Title>
    </Chip>
  );
});

const Title = styled.span`
  ${ellipsis()}
  font-size: 14px;
  font-weight: 500;
  color: ${s("text")};
`;

const Chip = styled(Link)`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  height: 24px;
  padding: 0px 4px 0px 2px;
  border-radius: 8px;
  border: 1px solid ${s("inputBorder")};
  color: ${s("textSecondary")};
  cursor: var(--pointer);
  user-select: none;

  &:${hover},
  &:active,
  &:focus-visible {
    background: ${s("listItemHoverBackground")};
  }
`;
