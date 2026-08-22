import { observer } from "mobx-react";
import { TableOfContentsIcon } from "outline-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { EmojiText } from "@shared/components/EmojiText";
import { HeadingPrefixHelper } from "@shared/editor/extensions/HeadingPrefix";
import { s } from "@shared/styles";
import { DocumentPreference, HeadingPrefixStyle } from "@shared/types";
import { createAction, createActionGroup } from "~/actions";
import { ActiveDocumentSection } from "~/actions/sections";
import Button from "~/components/Button";
import { useDocumentContext } from "~/components/DocumentContext";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { useMenuAction } from "~/hooks/useMenuAction";
import history, { patchLocation } from "~/utils/history";

function TableOfContentsMenu() {
  const documentContext = useDocumentContext();
  // Headings inside tables carry no number and are not listed.
  const headings = useMemo(
    () => documentContext.headings.filter((heading) => !heading.inTable),
    [documentContext.headings]
  );
  const { t } = useTranslation();
  const minHeading = headings.reduce(
    (memo, heading) => (heading.level < memo ? heading.level : memo),
    Infinity
  );
  const headingPrefix =
    documentContext.document?.getPreference(DocumentPreference.HeadingPrefix) ??
    HeadingPrefixStyle.None;

  const headingActions = useMemo(() => {
    // Compute prefix labels over all headings so they match the numbering
    // shown in the document, then attach them before headings are filtered.
    const labels =
      headingPrefix === HeadingPrefixStyle.None
        ? undefined
        : HeadingPrefixHelper.labels(
            headings.map((heading) => heading.level),
            headingPrefix,
            { indented: true }
          );

    return headings
      .map((heading, index) => ({ heading, label: labels?.[index] }))
      .filter(({ heading }) => heading.level <= 4)
      .map(({ heading, label }) =>
        createAction({
          name: (
            <HeadingWrapper $level={heading.level - minHeading}>
              {label && <Prefix>{label}</Prefix>}
              <EmojiText>{heading.title}</EmojiText>
            </HeadingWrapper>
          ),
          section: ActiveDocumentSection,
          perform: () =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() =>
                // Navigate via history so the location state (active sidebar
                // context) is retained when scrolling to the heading.
                history.push(
                  patchLocation(history.location, { hash: `#${heading.id}` })
                )
              )
            ),
        })
      );
  }, [headings, minHeading, headingPrefix]);

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
      <Button
        icon={<TableOfContentsIcon />}
        aria-label={t("Table of contents")}
        borderOnHover
        neutral
      />
    </DropdownMenu>
  );
}

const Prefix = styled.span`
  color: ${s("textSecondary")};
  margin-inline-end: 0.25em;
  user-select: none;
`;

const HeadingWrapper = styled.div<{ $level?: number }>`
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;

  margin-left: ${({ $level }) => `${12 * ($level ?? 0)}px`};
`;

export default observer(TableOfContentsMenu);
