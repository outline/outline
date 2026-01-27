import { observer } from "mobx-react";
import { TableOfContentsIcon } from "outline-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { EmojiText } from "@shared/components/EmojiText";
import { createAction, createActionGroup } from "~/actions";
import { ActiveDocumentSection } from "~/actions/sections";
import Button from "~/components/Button";
import { useDocumentContext } from "~/components/DocumentContext";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { useMenuAction } from "~/hooks/useMenuAction";

function TableOfContentsMenu() {
  const { headings } = useDocumentContext();
  const { t } = useTranslation();
  const minHeading = headings.reduce(
    (memo, heading) => (heading.level < memo ? heading.level : memo),
    Infinity
  );

  const headingActions = useMemo(
    () =>
      headings
        .filter((heading) => heading.level < 4)
        .map((heading) =>
          createAction({
            name: (
              <HeadingWrapper $level={heading.level - minHeading}>
                <EmojiText>{heading.title}</EmojiText>
              </HeadingWrapper>
            ),
            section: ActiveDocumentSection,
            perform: () =>
              requestAnimationFrame(() =>
                requestAnimationFrame(
                  () => (window.location.hash = `#${heading.id}`)
                )
              ),
          })
        ),
    [headings, minHeading]
  );

  const actions = useMemo(() => {
    let childActions = headingActions;

    if (!childActions.length) {
      childActions = [
        createAction({
          name: (
            <HeadingWrapper>
              {t("Headings you add to the document will appear here")}
            </HeadingWrapper>
          ),
          section: ActiveDocumentSection,
          disabled: true,
          perform: () => {},
        }),
      ];
    }

    return [
      createActionGroup({
        name: t("Contents"),
        actions: childActions,
      }),
    ];
  }, [t, headingActions]);

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} ariaLabel={t("Table of contents")}>
      <Button icon={<TableOfContentsIcon />} borderOnHover neutral />
    </DropdownMenu>
  );
}

const HeadingWrapper = styled.div<{ $level?: number }>`
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;

  margin-left: ${({ $level }) => `${12 * ($level ?? 0)}px`};
`;

export default observer(TableOfContentsMenu);
