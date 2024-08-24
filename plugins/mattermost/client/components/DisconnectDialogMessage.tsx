import React from "react";
import { Trans } from "react-i18next";
import Text from "~/components/Text";

const DisconnectDialogMessage = () => (
  <>
    <Text type="secondary">
      <Trans>Disconnecting your account will prevent</Trans>
    </Text>
    <ul>
      <li>
        <Text type="secondary">
          <Trans>searching for documents from Mattermost.</Trans>
        </Text>
      </li>
      <li>
        <Text type="secondary">
          <Trans>posting document updates to Mattermost.</Trans>
        </Text>
      </li>
    </ul>
    <Text type="secondary">
      <Trans>Are you sure?</Trans>
    </Text>
  </>
);

export default DisconnectDialogMessage;
