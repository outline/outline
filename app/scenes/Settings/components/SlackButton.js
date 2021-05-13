// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import { slackAuth } from "shared/utils/routeHelpers";
import Button from "components/Button";
import SlackIcon from "components/SlackIcon";
import env from "env";

type Props = {|
  scopes?: string[],
  redirectUri: string,
  state?: string,
  label?: string,
|};

function SlackButton({ state = "", scopes, redirectUri, label }: Props) {
  const { t } = useTranslation();
  const handleClick = () =>
    (window.location.href = slackAuth(
      state,
      scopes,
      env.SLACK_KEY,
      redirectUri
    ));

  return (
    <Button
      onClick={handleClick}
      icon={<SlackIcon fill="currentColor" />}
      neutral
    >
      {label || t("Add to Slack")}
    </Button>
  );
}

export default SlackButton;
