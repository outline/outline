import { observer } from "mobx-react";
import type * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import type Tag from "~/models/Tag";
import history from "~/utils/history";
import { isNewTabClick, truncateTags } from "~/utils/tags";
import Text from "./Text";
import Tooltip from "./Tooltip";

interface Props {
  /** Tags to display. */
  tags: Tag[] | undefined;
  /** Optional handler when a pill's dismiss button is clicked. */
  onRemove?: (tag: Tag) => void;
  /** Optional path each pill links to, renders pills as buttons. */
  getPath?: (tag: Tag) => string;
  /** Show at most this many tags, followed by the count of the others. */
  limit?: number;
  /** Render in a single, compact row. */
  compact?: boolean;
}

/**
 * Renders a horizontal list of tag pills. When `onRemove` is provided each
 * pill shows a dismiss button.
 *
 * @param tags - tags to display.
 * @param onRemove - optional handler when a pill's dismiss button is clicked.
 * @param getPath - optional path each pill links to.
 * @param limit - optional number of tags to show before "+k".
 */
function TagListComponent({ tags, onRemove, getPath, limit, compact }: Props) {
  const { t } = useTranslation();

  if (!tags?.length) {
    return null;
  }

  const { visible, hiddenCount } = limit
    ? truncateTags(tags, limit)
    : { visible: tags, hiddenCount: 0 };
  const hiddenNames = tags
    .slice(visible.length)
    .map((tag) => `#${tag.name}`)
    .join(", ");

  // Pills may sit inside another link, eg. a document row, so they are buttons
  // that navigate themselves – opening a new tab on middle or modifier clicks.
  const handleClick = (path: string) => (event: React.MouseEvent) => {
    if (event.type === "auxclick" && event.button !== 1) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (isNewTabClick(event)) {
      window.open(path, "_blank", "noopener");
    } else {
      history.push(path);
    }
  };

  return (
    <Container $compact={compact}>
      {visible.map((tag) => {
        const content = (
          <>
            {tag.color && <Swatch style={{ background: tag.color }} />}
            <Name size="xsmall" weight="bold">
              #{tag.name}
            </Name>
          </>
        );

        return (
          <Pill key={tag.id} $compact={compact} title={`#${tag.name}`}>
            {getPath ? (
              <PillButton
                type="button"
                onClick={handleClick(getPath(tag))}
                onAuxClick={handleClick(getPath(tag))}
              >
                {content}
              </PillButton>
            ) : (
              content
            )}
            {onRemove && (
              <Remove
                type="button"
                aria-label={t("Remove tag {{name}}", { name: tag.name })}
                onClick={() => onRemove(tag)}
              >
                ×
              </Remove>
            )}
          </Pill>
        );
      })}
      {hiddenCount > 0 && (
        <Tooltip content={hiddenNames}>
          <More
            size="xsmall"
            type="tertiary"
            tabIndex={0}
            aria-label={t("{{ count }} more tag, {{ names }}", {
              count: hiddenCount,
              names: hiddenNames,
            })}
          >
            +{hiddenCount}
          </More>
        </Tooltip>
      )}
    </Container>
  );
}

export const TagList = observer(TagListComponent);

const Container = styled.div<{ $compact?: boolean }>`
  display: flex;
  flex-wrap: ${(props) => (props.$compact ? "nowrap" : "wrap")};
  align-items: center;
  gap: 4px;
  padding: ${(props) => (props.$compact ? "2px 0 0" : "4px 0")};
  min-width: 0;
  overflow: hidden;
`;

const Pill = styled.span<{ $compact?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  /* In a single row long names shrink and ellipsize, keeping "+k" visible. */
  flex-shrink: ${(props) => (props.$compact ? 1 : 0)};
  min-width: 0;
  background: ${({ theme }) => theme.listItemHoverBackground};
  color: ${({ theme }) => theme.textSecondary};
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
`;

const PillButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  border-radius: 2px;
  background: none;
  border: none;
  padding: 0;
  color: inherit;
  cursor: var(--pointer);

  &:hover {
    color: ${({ theme }) => theme.text};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent};
    outline-offset: 2px;
  }
`;

const Name = styled(Text)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Swatch = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
`;

const More = styled(Text)`
  flex-shrink: 0;
  cursor: default;
  border-radius: 2px;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent};
    outline-offset: 2px;
  }
`;

const Remove = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  padding: 0;
  line-height: 1;
  opacity: 0.6;

  &:hover {
    opacity: 1;
  }
`;
