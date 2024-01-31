import * as React from "react";
import { useTranslation } from "react-i18next";
import { UrlHelper } from "@shared/utils/UrlHelper";
import Button from "~/components/Button";

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
    window.location.href = UrlHelper.Slack.auth(state, scopes, redirectUri);
  };

  return (
    <Button onClick={handleClick} icon={icon} neutral>
      {label || t("Add to Slack")}
    </Button>
  );
}

export default SlackButton;
