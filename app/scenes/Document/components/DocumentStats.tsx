import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import { useDocumentContext } from "~/components/DocumentContext";
import useEditingFocus from "~/hooks/useEditingFocus";
import { useFormatNumber } from "~/hooks/useFormatNumber";
import useTextSelection from "~/hooks/useTextSelection";
import { useTextStats } from "~/hooks/useTextStats";

/**
 * Displays live word, character, and paragraph counts for the document that is
 * currently open in the editor.
 */
function DocumentStats() {
  const { t } = useTranslation();
  const { stats } = useDocumentContext();
  const selectedText = useTextSelection();
  const selected = useTextStats(selectedText);
  const formatNumber = useFormatNumber();
  const isEditingFocus = useEditingFocus();
  const hasSelection = selectedText.length > 0;

  return (
    <Container gap={16} align="center" $hidden={isEditingFocus}>
      {hasSelection ? (
        <>
          <Text type="tertiary" size="xsmall">
            {t(`{{ number }} words selected`, {
              count: selected.words,
              number: formatNumber(selected.words),
            })}
          </Text>
          <Text type="tertiary" size="xsmall">
            {t(`{{ number }} characters selected`, {
              count: selected.characters,
              number: formatNumber(selected.characters),
            })}
          </Text>
        </>
      ) : (
        <>
          <Text type="tertiary" size="xsmall">
            {t(`{{ number }} words`, {
              count: stats.words,
              number: formatNumber(stats.words),
            })}
          </Text>
          <Text type="tertiary" size="xsmall">
            {t(`{{ number }} characters`, {
              count: stats.characters,
              number: formatNumber(stats.characters),
            })}
          </Text>
          <Text type="tertiary" size="xsmall">
            {t(`{{ number }} paragraphs`, {
              count: stats.paragraphs,
              number: formatNumber(stats.paragraphs),
            })}
          </Text>
          {stats.readingTime > 0 && (
            <Text type="tertiary" size="xsmall">
              {t(`{{ number }} minute read`, {
                number: formatNumber(stats.readingTime),
              })}
            </Text>
          )}
        </>
      )}
    </Container>
  );
}

const Container = styled(Flex)<{ $hidden: boolean }>`
  display: none;
  white-space: nowrap;
  user-select: none;
  pointer-events: none;
  background: ${s("background")};
  border-start-start-radius: 4px;
  padding-block: 6px 12px;
  padding-inline: 12px;
  transition: opacity 500ms ease-in-out;
  ${(props) => props.$hidden && "opacity: 0;"}

  ${breakpoint("tablet")`
    display: flex;
  `};

  @media print {
    display: none;
  }
`;

export default observer(DocumentStats);
