import { t } from "i18next";
import type { Team } from "@server/models";
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
              returnObjects: false,
            }
          ) +
          ". " +
          (team
            ? `<${team.url}/settings/integrations/slack|${String(
                t("Link your account", {
                  ...opts(),
                  returnObjects: false,
                })
              )}>`
            : t(
                "Link your account in {{ appName }} settings to search from Slack",
                {
                  ...opts(),
                  appName,
                  returnObjects: false,
                }
              )),
      },
    },
  ];
}
