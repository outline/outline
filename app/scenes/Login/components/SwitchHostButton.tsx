import { GlobeIcon } from "outline-icons";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";
import Desktop from "~/utils/Desktop";
import { SwitchHostDialog } from "./SwitchHostDialog";

/**
 * Control shown in the top right of the login screen when running inside the
 * desktop app, allowing the user to switch the Outline installation to connect
 * to.
 */
export function SwitchHostButton() {
  const { t } = useTranslation();
  const { dialogs } = useStores();

  const handleClick = useCallback(() => {
    dialogs.openModal({
      title: t("Choose workspace"),
      content: <SwitchHostDialog />,
    });
  }, [dialogs, t]);

  // Hidden on the web and in older desktop apps that predate the bridge method
  // used to validate the chosen installation.
  if (!Desktop.isElectron() || !Desktop.bridge?.loadAuthConfig) {
    return null;
  }

  return (
    <Position>
      <Tooltip content={t("Choose workspace")} side="bottom">
        <Button onClick={handleClick} aria-label={t("Choose workspace")}>
          <Host>{window.location.host}</Host>
          <GlobeIcon />
        </Button>
      </Tooltip>
    </Position>
  );
}

const Position = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  padding: ${Desktop.isElectron() ? "48px 32px" : "32px"};
`;

const Button = styled(NudeButton)`
  display: flex;
  align-items: center;
  gap: 8px;
  width: auto;
  height: auto;
  color: ${s("textSecondary")};

  &:hover {
    color: ${s("text")};
  }
`;

const Host = styled.span`
  font-size: 14px;
  font-weight: 500;
`;
