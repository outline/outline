import { observer } from "mobx-react";
import * as React from "react";
import { Trans } from "react-i18next";
import { IntegrationScene } from "~/scenes/Settings/components/IntegrationScene";
import Heading from "~/components/Heading";
import Notice from "~/components/Notice";
import Text from "~/components/Text";
import env from "~/env";
import BitbucketIcon from "./Icon";

function Bitbucket() {
  return (
    <IntegrationScene title="Bitbucket" icon={<BitbucketIcon />}>
      <Heading>Bitbucket</Heading>

      {env.BITBUCKET_USERNAME ? (
        <>
          <Text as="p">
            <Trans>
              Bitbucket integration is configured and ready to use. You can now:
            </Trans>
          </Text>

          <ul>
            <li>
              <Trans>Paste Bitbucket issue URLs to get rich previews</Trans>
            </li>
            <li>
              <Trans>
                Paste Bitbucket pull request URLs to get rich previews
              </Trans>
            </li>
            <li>
              <Trans>
                Use @ mentions to reference Bitbucket issues and pull requests
              </Trans>
            </li>
          </ul>

          <Notice>
            <Trans>
              This integration uses app password authentication and is
              configured at the server level. No additional setup is required.
            </Trans>
          </Notice>
        </>
      ) : (
        <Notice>
          <Trans>
            Bitbucket integration is not configured. Please set the required
            environment variables (BITBUCKET_USERNAME and
            BITBUCKET_APP_PASSWORD) and restart the server.
          </Trans>
        </Notice>
      )}
    </IntegrationScene>
  );
}

export default observer(Bitbucket);
