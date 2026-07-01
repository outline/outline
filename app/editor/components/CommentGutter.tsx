import { t } from "i18next";
import { observer } from "mobx-react";
import { CommentIcon } from "outline-icons";
import styled from "styled-components";
import { s } from "@shared/styles";
import stores from "~/stores";

type IconProps = {
  /** The id of the comment thread this indicator represents. */
  commentId: string;
  /** Callback invoked when the indicator is clicked, opening the thread. */
  onClick?: (commentId: string) => void;
  /** Callback invoked when the indicator is hovered or unhovered. */
  onHover?: (commentId: string, hovered: boolean) => void;
};

const CommentGutterIcon = observer(function CommentGutterIcon({
  commentId,
  onClick,
  onHover,
}: IconProps) {
  const count = stores.comments.inThread(commentId).length;
  const setHovered = (hovered: boolean) => onHover?.(commentId, hovered);

  return (
    <Icon
      type="button"
      aria-label={t("View comment thread")}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(commentId);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <CommentIcon size={18} />
      {count > 0 && <span>{count}</span>}
    </Icon>
  );
});

type Props = {
  /** The ids of the comment threads present on this line. */
  commentIds: string[];
  /** Callback invoked when an indicator is clicked, opening the thread. */
  onClickCommentMark?: (commentId: string) => void;
  /** Callback invoked when an indicator is hovered, highlighting the mark. */
  onHoverCommentMark?: (commentId: string, hovered: boolean) => void;
};

/**
 * Renders the comment indicators shown in the gutter beside a line that
 * contains one or more unresolved comment marks.
 */
export function CommentGutter({
  commentIds,
  onClickCommentMark,
  onHoverCommentMark,
}: Props) {
  return (
    <Gutter contentEditable={false} suppressContentEditableWarning>
      {commentIds.map((commentId) => (
        <CommentGutterIcon
          key={commentId}
          commentId={commentId}
          onClick={onClickCommentMark}
          onHover={onHoverCommentMark}
        />
      ))}
    </Gutter>
  );
}

const Gutter = styled.div`
  position: absolute;
  inset-inline-start: 100%;
  margin-inline-start: 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  user-select: none;
  white-space: nowrap;
`;

const Icon = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin: 0;
  padding: 2px 6px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: ${s("textTertiary")};
  cursor: var(--pointer);
  font-size: 13px;
  font-weight: 500;
  line-height: 1;

  &:hover {
    background: ${s("listItemHoverBackground")};
    color: ${s("text")};
  }

  svg {
    flex-shrink: 0;
    fill: currentColor;
  }
`;
