import { observer } from "mobx-react";
import { TableOfContentsIcon, EditIcon, SettingsIcon } from "outline-icons";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import useMeasure from "react-use-measure";
import styled from "styled-components";
import Icon from "@shared/components/Icon";
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
import HeaderBranding from "~/components/Sharing/components/HeaderBranding";
import ShareSettingsPopover from "~/components/Sharing/components/ShareSettingsPopover";
import { useTeamContext } from "~/components/TeamContext";
import Tooltip from "~/components/Tooltip";
import env from "~/env";
import useCurrentUser from "~/hooks/useCurrentUser";
import useEditingFocus from "~/hooks/useEditingFocus";
import useKeyDown from "~/hooks/useKeyDown";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useMobile from "~/hooks/useMobile";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import TableOfContentsMenu from "~/menus/TableOfContentsMenu";
import type Document from "~/models/Document";
import { documentEditPath } from "~/utils/routeHelpers";
import PublicBreadcrumb from "./PublicBreadcrumb";

type Props = {
  document: Document;
};

function SharedDocumentHeader({ document }: Props) {
  const { t } = useTranslation();
  const { ui, shares } = useStores();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const isMobileMedia = useMobile();
  const isEditingFocus = useEditingFocus();

  // Set CSS variable for header offset (used by sticky table headers)
  useEffect(() => {
    window.document.documentElement.style.setProperty(
      "--header-offset",
      isEditingFocus ? "0px" : "64px"
    );
  }, [isEditingFocus]);

  const { hasHeadings } = useDocumentContext();
  const sidebarContext = useLocationSidebarContext();
  const [measureRef, size] = useMeasure();
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

  const can = usePolicy(document);
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

  const editAction = can.update ? (
    <Action>
      <Tooltip
        content={t("Edit {{noun}}", { noun: document.noun })}
        shortcut="e"
        placement="bottom"
      >
        <Button
          as={Link}
          icon={<EditIcon />}
          to={{
            pathname: documentEditPath(document),
            state: { sidebarContext },
          }}
          haptic="light"
          neutral
        >
          {isMobile ? null : t("Edit")}
        </Button>
      </Tooltip>
    </Action>
  ) : (
    <div />
  );

  const hasSidebar = !!(sharedTree && sharedTree.children?.length);
  const tocInLeft = !isMobile && hasSidebar && tocPosition === TOCPosition.Left;

  return (
    <StyledHeader
      ref={measureRef}
      $hidden={isEditingFocus}
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
          {hasHeadings && !isMobile && !tocInLeft && <Action>{toc}</Action>}
          {allowSubscriptions !== false && !user && env.EMAIL_ENABLED && (
            <SubscribeAction shareId={shareId} documentId={document.id} />
          )}
          <AppearanceAction />
          {can.update && share && (
            <Action>
              <ShareSettingsPopover share={share}>
                <Button
                  icon={<SettingsIcon />}
                  aria-label={t("Display settings")}
                  neutral
                  borderOnHover
                />
              </ShareSettingsPopover>
            </Action>
          )}
          {editAction}
        </>
      }
    />
  );
}

const StyledHeader = styled(Header)<{ $hidden: boolean }>`
  transition: opacity 500ms ease-in-out;
  ${(props) => props.$hidden && "opacity: 0;"}
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
