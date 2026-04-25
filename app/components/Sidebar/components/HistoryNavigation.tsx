import { ArrowIcon, ClockIcon } from "outline-icons";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { createActionGroup } from "~/actions";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useRecentDocumentActions from "~/components/CommandBar/useRecentDocumentActions";
import { useMenuAction } from "~/hooks/useMenuAction";
import useStores from "~/hooks/useStores";
import Desktop from "~/utils/Desktop";

const RECENT_DOCUMENTS_LIMIT = 10;

function HistoryNavigation(props: React.ComponentProps<typeof Flex>) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const [canGoBack, setCanGoBack] = React.useState(false);
  const [canGoForward, setCanGoForward] = React.useState(false);
  const [supported, setSupported] = React.useState(false);

  const recentActions = useRecentDocumentActions(RECENT_DOCUMENTS_LIMIT);
  const menuActions = React.useMemo(
    () => [
      createActionGroup({
        name: t("Recent"),
        actions: recentActions,
      }),
    ],
    [t, recentActions]
  );
  const menuAction = useMenuAction(menuActions);

  const handleOpen = React.useCallback(() => {
    void documents.fetchRecentlyViewed({ limit: RECENT_DOCUMENTS_LIMIT });
  }, [documents]);

  React.useEffect(() => {
    if (!(Desktop.bridge && "onNavigationStateChanged" in Desktop.bridge)) {
      return;
    }
    setSupported(true);
    return Desktop.bridge.onNavigationStateChanged((state) => {
      setCanGoBack(state.canGoBack);
      setCanGoForward(state.canGoForward);
    });
  }, []);

  if (!Desktop.isMacApp() || !supported) {
    return null;
  }

  return (
    <Navigation gap={4} {...props}>
      <Tooltip content={t("Go back")} disabled={!canGoBack}>
        <NudeButton
          aria-label={t("Go back")}
          disabled={!canGoBack}
          onClick={() => Desktop.bridge?.goBack()}
        >
          <Back $enabled={canGoBack} />
        </NudeButton>
      </Tooltip>
      <Tooltip content={t("Go forward")} disabled={!canGoForward}>
        <NudeButton
          aria-label={t("Go forward")}
          disabled={!canGoForward}
          onClick={() => Desktop.bridge?.goForward()}
        >
          <Forward $enabled={canGoForward} />
        </NudeButton>
      </Tooltip>
      <Tooltip content={t("History")}>
        <DropdownMenu
          action={menuAction}
          ariaLabel={t("History")}
          onOpen={handleOpen}
        >
          <NudeButton aria-label={t("History")}>
            <StyledClockIcon />
          </NudeButton>
        </DropdownMenu>
      </Tooltip>
    </Navigation>
  );
}

const Navigation = styled(Flex)`
  position: absolute;
  inset-inline-end: 12px;
  top: 14px;

  button {
    cursor: default;
  }
`;

const Forward = styled(ArrowIcon)<{ $enabled: boolean }>`
  color: ${s("textTertiary")};
  opacity: ${(props) => (props.$enabled ? 0.5 : 0.15)};
  transition: color 100ms ease-in-out;

  &:active,
  &:hover {
    opacity: ${(props) => (props.$enabled ? 1 : 0.15)};
  }

  [dir="rtl"] & {
    transform: rotate(180deg);
  }
`;

const Back = styled(Forward)`
  transform: rotate(180deg);
  flex-shrink: 0;

  [dir="rtl"] & {
    transform: rotate(0deg);
  }
`;

const StyledClockIcon = styled(ClockIcon)`
  color: ${s("textTertiary")};
  opacity: 0.5;
  transition: color 100ms ease-in-out;

  &:active,
  &:hover,
  [data-state="open"] & {
    opacity: 1;
  }
`;

export default observer(HistoryNavigation);
