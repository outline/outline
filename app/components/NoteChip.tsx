import { observer } from "mobx-react";
import { DocumentIcon } from "outline-icons";
import { Link } from "react-router-dom";
import styled from "styled-components";
import Icon from "@shared/components/Icon";
import { s, hover, ellipsis } from "@shared/styles";
import { IconType } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import type Note from "~/models/Note";
type Props = {
  /** The note to display */
  note: Note;
};
/**
 * A compact, single line representation of a note displaying its icon and
 * title, linking to the note.
 */
export const NoteChip = observer(function NoteChip_({ note }: Props) {
  const { icon, color } = note;
  const title = note.titleWithDefault;
  const isEmoji = determineIconType(icon) === IconType.Emoji;
  return (
    <Chip
      dir={note.dir}
      to={{
        pathname: note.path,
        state: {
          title,
        },
      }}
    >
      {icon ? (
        <Icon value={icon} color={color ?? undefined} initial={note.initial} />
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
