import * as React from "react";
import { useTranslation } from "react-i18next";
import { slackAuth } from "@shared/utils/urlHelpers";
import Button from "~/components/Button";
import env from "~/env";

type Props = {
  scopes?: string[];
  redirectUri: string;
  icon?: React.ReactNode;
  state?: string;
  label?: string;
};

function SlackButton({ state = "", scopes, redirectUri, label, icon }: Props) {
  const { t } = useTranslation();

  const handleClick = () => {
    if (!env.SLACK_CLIENT_ID) {
      return;
    }

    window.location.href = slackAuth(
      state,
      scopes,
      env.SLACK_CLIENT_ID,
      redirectUri
    );
  };

  return (
    <Button onClick={handleClick} icon={icon} neutral>
      {label || t("Add to Slack")}
    </Button>
  );
}

export default SlackButton;
