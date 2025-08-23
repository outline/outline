import { observer } from "mobx-react";
import * as React from "react";
import { Trans } from "react-i18next";
import { IntegrationScene } from "~/scenes/Settings/components/IntegrationScene";
import Heading from "~/components/Heading";
import Notice from "~/components/Notice";
import Text from "~/components/Text";
import env from "~/env";
import JiraIcon from "./Icon";

function Jira() {
  return (
    <IntegrationScene title="Jira" icon={<JiraIcon />}>
      <Heading>Jira</Heading>

      {env.JIRA_URL && env.JIRA_EMAIL ? (
        <>
          <Text as="p">
            <Trans>
              Jira integration is configured and ready to use. You can now:
            </Trans>
          </Text>

          <ul>
            <li>
              <Trans>Paste Jira issue URLs to get rich previews</Trans>
            </li>
            <li>
              <Trans>Use @ mentions to reference Jira issues</Trans>
            </li>
            <li>
              <Trans>
                View issue details including assignee, status, priority, and
                custom fields
              </Trans>
            </li>
          </ul>

          <Notice>
            <Trans>
              This integration uses app token authentication and is configured
              at the server level. No additional setup is required.
            </Trans>
          </Notice>

          <Text as="p" type="secondary">
            <Trans>
              <strong>Configured fields:</strong> Jira assignee, ticket status,
              OE Application Module Group, OE Application Module, ticket
              summary, and priority.
            </Trans>
          </Text>
        </>
      ) : (
        <Notice>
          <Trans>
            Jira integration is not configured. Please set the required
            environment variables (JIRA_URL, JIRA_EMAIL, and JIRA_APP_TOKEN) and
            restart the server.
          </Trans>
        </Notice>
      )}
    </IntegrationScene>
  );
}

export default observer(Jira);
