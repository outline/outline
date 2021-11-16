import * as React from "react";
import { useTranslation } from "react-i18next";
import { slackAuth } from "shared/utils/routeHelpers";
import Button from "components/Button";
import SlackIcon from "components/SlackIcon";
import env from "env";

type Props = {
  scopes?: string[];
  redirectUri: string;
  state?: string;
  label?: string;
};

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
      // @ts-expect-error ts-migrate(2322) FIXME: Type '{ fill: string; }' is not assignable to type... Remove this comment to see the full error message
      icon={<SlackIcon fill="currentColor" />}
      neutral
    >
      // @ts-expect-error ts-migrate(2322) FIXME: Type 'string | HTMLCollection'
      is not assignable t... Remove this comment to see the full error message
      {label || t("Add to Slack")}
    </Button>
  );
}

export default SlackButton;
