import { t } from "i18next";
import { Team } from "@server/models";
import { opts } from "@server/utils/i18n";
import env from "../env";

export function presentUserNotLinkedBlocks(team?: Team) {
  const appName = env.APP_NAME;

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          t(
            `It looks like you haven’t linked your {{ appName }} account to Slack yet`,
            {
              ...opts(),
              appName,
            }
          ) +
          ". " +
          (team
            ? `<${team.url}/settings/integrations/slack|${t(
                "Link your account",
                opts()
              )}>`
            : t(
                "Link your account in {{ appName }} settings to search from Slack",
                {
                  ...opts(),
                  appName,
                }
              )),
      },
    },
  ];
}
