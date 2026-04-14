import { ArrowIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import Desktop from "~/utils/Desktop";

function HistoryNavigation(props: React.ComponentProps<typeof Flex>) {
  const { t } = useTranslation();
  const [canGoBack, setCanGoBack] = React.useState(false);
  const [canGoForward, setCanGoForward] = React.useState(false);
  const [supported, setSupported] = React.useState(false);

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
      <Tooltip content={t("Go back")}>
        <NudeButton
          aria-label={t("Go back")}
          disabled={!canGoBack}
          onClick={() => Desktop.bridge?.goBack()}
        >
          <Back $enabled={canGoBack} />
        </NudeButton>
      </Tooltip>
      <Tooltip content={t("Go forward")}>
        <NudeButton
          aria-label={t("Go forward")}
          disabled={!canGoForward}
          onClick={() => Desktop.bridge?.goForward()}
        >
          <Forward $enabled={canGoForward} />
        </NudeButton>
      </Tooltip>
    </Navigation>
  );
}

const Navigation = styled(Flex)`
  position: absolute;
  right: 12px;
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
`;

const Back = styled(Forward)`
  transform: rotate(180deg);
  flex-shrink: 0;
`;

export default HistoryNavigation;
