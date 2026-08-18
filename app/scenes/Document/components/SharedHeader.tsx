import { observer } from "mobx-react";
import { TableOfContentsIcon } from "outline-icons";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import useMeasure from "react-use-measure";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Icon from "@shared/components/Icon";
import { HEADER_HEIGHT } from "@shared/constants";
import useShare from "@shared/hooks/useShare";
import type { PublicTeam } from "@shared/types";
import { TOCPosition } from "@shared/types";
import { altDisplay } from "@shared/utils/keyboard";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import { useDocumentContext } from "~/components/DocumentContext";
import Flex from "~/components/Flex";
import Header from "~/components/Header";
import {
  AppearanceAction,
  SubscribeAction,
} from "~/components/Sharing/components/Actions";
import AuthenticatedIsland from "~/components/Sharing/components/AuthenticatedIsland";
import HeaderBranding from "~/components/Sharing/components/HeaderBranding";
import { useTeamContext } from "~/components/TeamContext";
import Tooltip from "~/components/Tooltip";
import env from "~/env";
import useEditingFocus from "~/hooks/useEditingFocus";
import useKeyDown from "~/hooks/useKeyDown";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
import useWindowScrollbarWidth from "~/hooks/useWindowScrollbarWidth";
import TableOfContentsMenu from "~/menus/TableOfContentsMenu";
import type Document from "~/models/Document";
import PublicBreadcrumb from "./PublicBreadcrumb";
import { SearchHighlightChip } from "./SearchHighlightChip";

type Props = {
  document: Document;
};

function SharedDocumentHeader({ document }: Props) {
  const { t } = useTranslation();
  const { ui, shares } = useStores();
  const isMobileMedia = useMobile();
  const isEditingFocus = useEditingFocus();

  // Set CSS variable for header offset (used by sticky table headers)
  useEffect(() => {
    window.document.documentElement.style.setProperty(
      "--header-offset",
      isEditingFocus ? "0px" : `${HEADER_HEIGHT}px`
    );
  }, [isEditingFocus]);

  const { hasHeadings } = useDocumentContext();
  const [measureRef, size] = useMeasure();
  const scrollbarWidth = useWindowScrollbarWidth() ?? 0;
  const { shareId, sharedTree, allowSubscriptions } = useShare();
  const share = shareId ? shares.get(shareId) : undefined;
  const team = useTeamContext() as PublicTeam | undefined;
  const tocPosition = team?.tocPosition ?? TOCPosition.Left;
  const isMobile = isMobileMedia || (size.width > 0 && size.width < 700);

  const handleToggle = useCallback(() => {
    // Public shares, by default, show ToC on load.
    if (ui.tocVisible === undefined) {
      ui.set({ tocVisible: false });
    } else {
      ui.set({ tocVisible: !ui.tocVisible });
    }
  }, [ui]);

  const showContents = ui.tocVisible !== false;

  useEffect(() => {
    if (isMobile && showContents) {
      ui.set({ tocVisible: false });
    }
  }, [isMobile, showContents, ui]);

  useKeyDown(
    (event) => event.ctrlKey && event.altKey && event.code === "KeyH",
    handleToggle,
    {
      allowInInput: true,
    }
  );

  if (!shareId) {
    return null;
  }

  const toc = (
    <Tooltip
      content={
        showContents
          ? t("Hide contents")
          : hasHeadings
            ? t("Show contents")
            : `${t("Show contents")} (${t("available when headings are added")})`
      }
      shortcut={`Ctrl+${altDisplay}+h`}
      placement="bottom"
    >
      <TocButton
        aria-label={t("Show contents")}
        onClick={handleToggle}
        icon={<TableOfContentsIcon />}
        $flipped={tocPosition === TOCPosition.Right}
        borderOnHover
        neutral
      />
    </Tooltip>
  );

  const hasSidebar = !!(sharedTree && sharedTree.children?.length);
  const tocInLeft = !isMobile && hasSidebar && tocPosition === TOCPosition.Left;

  return (
    <StyledHeader
      ref={measureRef}
      $hidden={isEditingFocus}
      $scrollbarWidth={scrollbarWidth}
      title={
        <Flex gap={4}>
          {document.icon && (
            <Icon
              value={document.icon}
              initial={document.initial}
              color={document.color ?? undefined}
            />
          )}
          {document.title}
        </Flex>
      }
      hasSidebar={hasSidebar}
      left={
        isMobile ? (
          hasHeadings ? (
            <TableOfContentsMenu />
          ) : null
        ) : hasSidebar ? (
          <PublicBreadcrumb
            documentId={document.id}
            shareId={shareId}
            sharedTree={sharedTree}
          >
            {hasHeadings && tocInLeft ? toc : null}
          </PublicBreadcrumb>
        ) : share ? (
          <HeaderBranding share={share} />
        ) : null
      }
      actions={
        <>
          <SearchHighlightChip />
          {hasHeadings && !isMobile && !tocInLeft && <Action>{toc}</Action>}
          {allowSubscriptions !== false && env.EMAIL_ENABLED && (
            <SubscribeAction shareId={shareId} documentId={document.id} />
          )}
          <AppearanceAction />
          <AuthenticatedIsland
            document={document}
            share={share}
            compact={isMobile}
          />
        </>
      }
    />
  );
}

type StyledHeaderProps = {
  $hidden: boolean;
  /** Width of the window scrollbar, which the header end edge falls behind. */
  $scrollbarWidth: number;
};

/**
 * The body spans the full viewport width, so the end of the header falls behind
 * a visible scrollbar. The removed-body-scroll-bar-size variable is set while a
 * modal holds the page scroll, when the scrollbar is momentarily gone, and
 * keeps the padding constant as menus and dialogs open.
 */
const endPadding = (base: number) => (props: StyledHeaderProps) =>
  `calc(${base}px + ${props.$scrollbarWidth}px + var(--removed-body-scroll-bar-size, 0px))`;

const StyledHeader = styled(Header)<StyledHeaderProps>`
  transition: opacity 500ms ease-in-out;
  ${(props) => props.$hidden && "opacity: 0;"}

  /* Doubled to take precedence over the padding shorthand of the header. */
  && {
    padding-right: ${endPadding(16)};

    ${breakpoint("tablet")`
      padding-right: ${endPadding(12)};
    `}
  }
`;

const TocButton = styled(Button)<{ $flipped?: boolean }>`
  ${(props) =>
    props.$flipped &&
    `
    svg {
      transform: scaleX(-1);
    }
  `}
`;

export default observer(SharedDocumentHeader);
