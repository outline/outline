import * as React from "react";
import { useTranslation } from "react-i18next";
import { IntegrationService, type IntegrationType } from "@shared/types";
import { ChatUtils } from "@shared/utils/ChatUtils";
import Button from "~/components/Button";
import { generateOAuthStateNonce } from "~/utils/oauth";
import { redirectTo } from "~/utils/urls";
import { SlackUtils } from "../../shared/SlackUtils";

type Props = {
  type: IntegrationType;
  scopes?: string[];
  state: { teamId: string; collectionId?: string };
  redirectUri?: string;
  icon?: React.ReactNode;
  label?: string;
};

function SlackButton({
  type,
  scopes,
  state: stateData,
  redirectUri,
  label,
  icon,
}: Props) {
  const { t } = useTranslation();

  const handleClick = () => {
    const nonce = generateOAuthStateNonce(
      ChatUtils.nonceCookie(IntegrationService.Slack)
    );
    const { teamId, ...rest } = stateData;
    const state = ChatUtils.createState(teamId, type, { nonce, ...rest });
    redirectTo(SlackUtils.authUrl(state, scopes, redirectUri));
  };

  return (
    <Button onClick={handleClick} icon={icon} neutral>
      {label || t("Add to Slack")}
    </Button>
  );
}

export default SlackButton;
