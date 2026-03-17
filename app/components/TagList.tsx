import { useTranslation } from "react-i18next";
import styled from "styled-components";
import type Tag from "~/models/Tag";
import Text from "./Text";

interface Props {
  /** Tags to display. */
  tags: Tag[];
  /** Optional handler when a pill's dismiss button is clicked. */
  onRemove?: (tag: Tag) => void;
}

/**
 * Renders a horizontal list of tag pills. When `onRemove` is provided each
 * pill shows a dismiss button.
 *
 * @param tags - tags to display.
 * @param onRemove - optional handler when a pill's dismiss button is clicked.
 */
export function TagList({ tags, onRemove }: Props) {
  const { t } = useTranslation();

  if (!tags.length) {
    return null;
  }

  return (
    <Container>
      {tags.map((tag) => (
        <Pill key={tag.id}>
          <Text size="xsmall" weight="bold">
            #{tag.name}
          </Text>
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
      ))}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 0;
`;

const Pill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: ${({ theme }) => theme.listItemHoverBackground};
  color: ${({ theme }) => theme.textSecondary};
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
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
