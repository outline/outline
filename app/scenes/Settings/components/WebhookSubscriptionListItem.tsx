import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import WebhookSubscription from "~/models/WebhookSubscription";
import Badge from "~/components/Badge";
import ListItem from "~/components/List/Item";
import WebhookMenu from "~/menus/WebhookMenu";

type Props = {
  webhook: WebhookSubscription;
};

const WebhookSubscriptionListItem = ({ webhook }: Props) => {
  const { t } = useTranslation();

  return (
    <ListItem
      key={webhook.id}
      title={
        <>
          {webhook.name}
          {!webhook.enabled && (
            <StyledBadge yellow={true}>{t("Disabled")}</StyledBadge>
          )}
        </>
      }
      subtitle={
        <>
          {t("Subscribed events")}: <code>{webhook.events.join(", ")}</code>
        </>
      }
      actions={<WebhookMenu webhook={webhook} />}
    />
  );
};

const StyledBadge = styled(Badge)`
  position: absolute;
`;

export default WebhookSubscriptionListItem;
