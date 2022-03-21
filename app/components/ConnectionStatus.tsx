import { observer } from "mobx-react";
import { DisconnectedIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Fade from "~/components/Fade";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";

function ConnectionStatus() {
  const { ui } = useStores();
  const theme = useTheme();
  const { t } = useTranslation();

  return ui.multiplayerStatus === "connecting" ||
    ui.multiplayerStatus === "disconnected" ? (
    <Tooltip
      tooltip={
        <Centered>
          <strong>{t("Server connection lost")}</strong>
          <br />
          {t("Edits you make will sync once you’re online")}
        </Centered>
      }
      placement="bottom"
    >
      <Button>
        <Fade>
          <DisconnectedIcon color={theme.sidebarText} />
        </Fade>
      </Button>
    </Tooltip>
  ) : null;
}

const Button = styled(NudeButton)`
  display: none;
  position: fixed;
  bottom: 0;
  margin: 24px;
  transform: translateX(-32px);

  ${breakpoint("tablet")`
    display: block;
  `};

  @media print {
    display: none;
  }
`;

const Centered = styled.div`
  text-align: center;
`;

export default observer(ConnectionStatus);
