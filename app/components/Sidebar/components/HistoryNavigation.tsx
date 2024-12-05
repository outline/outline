import { ArrowIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { isMac } from "@shared/utils/browser";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useKeyDown from "~/hooks/useKeyDown";
import Desktop from "~/utils/Desktop";

function HistoryNavigation(props: React.ComponentProps<typeof Flex>) {
  const { t } = useTranslation();
  const [back, setBack] = React.useState(false);
  const [forward, setForward] = React.useState(false);

  useKeyDown(
    (event) =>
      isMac()
        ? event.metaKey && event.key === "["
        : event.altKey && event.key === "ArrowLeft",
    () => {
      setBack(true);
      setTimeout(() => setBack(false), 100);
    }
  );

  useKeyDown(
    (event) =>
      isMac()
        ? event.metaKey && event.key === "]"
        : event.altKey && event.key === "ArrowRight",
    () => {
      setForward(true);
      setTimeout(() => setForward(false), 100);
    }
  );

  if (!Desktop.isMacApp()) {
    return null;
  }

  return (
    <Navigation gap={4} {...props}>
      <Tooltip content={t("Go back")}>
        <NudeButton onClick={() => Desktop.bridge?.goBack()}>
          <Back $active={back} />
        </NudeButton>
      </Tooltip>
      <Tooltip content={t("Go forward")}>
        <NudeButton onClick={() => Desktop.bridge?.goForward()}>
          <Forward $active={forward} />
        </NudeButton>
      </Tooltip>
    </Navigation>
  );
}

const Navigation = styled(Flex)`
  position: absolute;
  right: 12px;
  top: 14px;
`;

const Forward = styled(ArrowIcon)<{ $active: boolean }>`
  color: ${s("textTertiary")};
  opacity: ${(props) => (props.$active ? 1 : 0.5)};
  transition: color 100ms ease-in-out;

  &:active,
  &:hover {
    opacity: 1;
  }
`;

const Back = styled(Forward)`
  transform: rotate(180deg);
  flex-shrink: 0;
`;

export default HistoryNavigation;
