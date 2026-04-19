import { format as formatDate } from "date-fns";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Text from "@shared/components/Text";
import { dateLocale } from "@shared/utils/date";
import { RevisionHelper } from "@shared/utils/RevisionHelper";
import type Document from "~/models/Document";
import type Event from "~/models/Event";
import Revision from "~/models/Revision";
import { InputSelect, type Option } from "~/components/InputSelect";
import Switch from "~/components/Switch";
import useUserLocale from "~/hooks/useUserLocale";
import { revisionCollaboratorText } from "./utils";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import { ConditionalFade } from "~/components/Fade";

export const COMPARE_TO_PREVIOUS = "previous";

interface Props {
  showChanges: boolean;
  onShowChangesToggle: (checked: boolean) => void;
  items: (Revision | Event<Document>)[];
  document?: Document;
  selectedRevisionId?: string;
  compareTo: string;
  onCompareToChange: (value: string) => void;
}

export function HighlightChangesControl({
  showChanges,
  onShowChangesToggle,
  items,
  document,
  selectedRevisionId,
  compareTo,
  onCompareToChange,
}: Props) {
  const { t } = useTranslation();
  const userLocale = useUserLocale();
  const skipFadeRef = React.useRef(showChanges);

  const compareOptions = React.useMemo((): Option[] => {
    const revisionItems = items.filter(
      (item): item is Revision => item instanceof Revision
    );

    const locale = dateLocale(userLocale);
    const resolvedSelectedId =
      selectedRevisionId === "latest" && document
        ? RevisionHelper.latestId(document.id)
        : selectedRevisionId;

    const options: Option[] = [
      {
        type: "item",
        label: t("Previous version"),
        value: COMPARE_TO_PREVIOUS,
      },
    ];

    const latestId = document
      ? RevisionHelper.latestId(document.id)
      : undefined;

    for (const rev of revisionItems) {
      if (rev.id === resolvedSelectedId) {
        continue;
      }

      const dateLabel = formatDate(new Date(rev.createdAt), "MMM do, h:mm a", {
        locale,
      });
      const collaboratorText = revisionCollaboratorText(rev, t);

      options.push({
        type: "item",
        label: rev.name ?? dateLabel,
        value: rev.id === latestId ? "latest" : rev.id,
        description: collaboratorText,
      });
    }

    return options;
  }, [items, selectedRevisionId, document, userLocale, t]);

  return (
    <Content>
      <ResizingHeightContainer>
        <Text size="small" as="div" style={{ padding: 4 }}>
          <Switch
            label={t("Highlight changes")}
            checked={showChanges}
            onChange={onShowChangesToggle}
          />
        </Text>
        {showChanges && (
          <ConditionalFade animate={!skipFadeRef.current}>
            <StyledInputSelect
              options={compareOptions}
              value={compareTo}
              onChange={onCompareToChange}
              label={t("Compare to")}
              displayValue={(item) => (
                <>
                  <Text weight="bold">{t("Compare to")}</Text> {item?.label}
                </>
              )}
              labelHidden
              nude
              short
            />
          </ConditionalFade>
        )}
      </ResizingHeightContainer>
    </Content>
  );
}

const StyledInputSelect = styled(InputSelect)`
  margin: -4px -9px -1px;
  width: calc(100% + 18px);
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  position: relative;
  inset-block-end: -1px;
  height: 40px;
`;

const Content = styled.div`
  margin: 0 16px 8px;
  border: 1px solid ${(props) => props.theme.inputBorder};
  border-radius: 6px;
  padding: 8px 8px 0;
  flex-shrink: 0;
`;
