import { observer } from "mobx-react";
import { DisconnectedIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import {
  AuthenticationFailed,
  AuthorizationFailed,
  DocumentTooLarge,
  TooManyConnections,
} from "@shared/collaboration/CloseEvents";
import Fade from "~/components/Fade";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";

function ConnectionStatus() {
  const { ui } = useStores();
  const { t } = useTranslation();

  const codeToMessage = {
    [DocumentTooLarge.code]: {
      title: t("Document is too large"),
      body: t(
        "This document has reached the maximum size and can no longer be edited"
      ),
    },
    [AuthenticationFailed.code]: {
      title: t("Authentication failed"),
      body: t("Please try logging out and back in again"),
    },
    [AuthorizationFailed.code]: {
      title: t("Authorization failed"),
      body: t("You may have lost access to this document, try reloading"),
    },
    [TooManyConnections.code]: {
      title: t("Too many users connected to document"),
      body: t("Your edits will sync once other users leave the document"),
    },
  };

  const message = ui.multiplayerErrorCode
    ? codeToMessage[ui.multiplayerErrorCode as keyof typeof codeToMessage]
    : undefined;

  return ui.multiplayerStatus === "connecting" ||
    ui.multiplayerStatus === "disconnected" ? (
    <Tooltip
      content={
        message ? (
          <Centered>
            <strong>{message.title}</strong>
            <br />
            {message.body}
          </Centered>
        ) : (
          <Centered>
            <strong>{t("Server connection lost")}</strong>
            <br />
            {t("Edits you make will sync once you’re online")}
          </Centered>
        )
      }
      placement="bottom"
    >
      <Button>
        <Fade>
          <DisconnectedIcon />
        </Fade>
      </Button>
    </Tooltip>
  ) : null;
}

const Button = styled(NudeButton)`
  display: none;
  position: fixed;
  bottom: 0;
  margin: 20px;
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
