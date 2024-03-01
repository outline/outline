import * as React from "react";
import { useTranslation } from "react-i18next";
import Button from "~/components/Button";
import { SlackUtils } from "../../shared/SlackUtils";

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
    window.location.href = SlackUtils.authUrl(state, scopes, redirectUri);
  };

  return (
    <Button onClick={handleClick} icon={icon} neutral>
      {label || t("Add to Slack")}
    </Button>
  );
}

export default SlackButton;
