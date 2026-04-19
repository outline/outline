import { observer } from "mobx-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type WebhookSubscription from "~/models/WebhookSubscription";
import { Avatar, AvatarSize } from "~/components/Avatar";
import { HEADER_HEIGHT } from "~/components/Header";
import { ContextMenu } from "~/components/Menu/ContextMenu";
import {
  type Props as TableProps,
  SortableTable,
} from "~/components/SortableTable";
import { type Column as TableColumn } from "~/components/Table";
import styled from "styled-components";
import { ellipsis } from "@shared/styles";
import Text from "~/components/Text";
import Time from "~/components/Time";
import Tooltip from "~/components/Tooltip";
import { HStack } from "~/components/primitives/HStack";
import { Status } from "~/scenes/Settings/components/Status";
import { FILTER_HEIGHT } from "~/scenes/Settings/components/StickyFilters";
import { useWebhookSubscriptionMenuActions } from "../hooks/useWebhookSubscriptionMenuActions";
import WebhookSubscriptionMenu from "./WebhookSubscriptionMenu";

const ROW_HEIGHT = 50;
const STICKY_OFFSET = HEADER_HEIGHT + FILTER_HEIGHT;

type Props = Omit<TableProps<WebhookSubscription>, "columns" | "rowHeight">;

const WebhookRowContextMenu = observer(function WebhookRowContextMenu({
  webhook,
  menuLabel,
  children,
}: {
  webhook: WebhookSubscription;
  menuLabel: string;
  children: React.ReactNode;
}) {
  const action = useWebhookSubscriptionMenuActions(webhook);
  return (
    <ContextMenu action={action} ariaLabel={menuLabel}>
      {children}
    </ContextMenu>
  );
});

export const WebhookSubscriptionsTable = observer(
  function WebhookSubscriptionsTable(props: Props) {
    const { t } = useTranslation();

    const applyContextMenu = useCallback(
      (webhook: WebhookSubscription, rowElement: React.ReactNode) => (
        <WebhookRowContextMenu webhook={webhook} menuLabel={t("Webhook")}>
          {rowElement}
        </WebhookRowContextMenu>
      ),
      [t]
    );

    const columns = useMemo<TableColumn<WebhookSubscription>[]>(
      () => [
        {
          type: "data",
          id: "name",
          header: t("Name"),
          accessor: (webhook) => webhook.name,
          component: (webhook) => (
            <HStack spacing={4} wrap>
              <Tooltip content={webhook.enabled ? t("Active") : t("Disabled")}>
                <Status $color={webhook.enabled ? "success" : "textTertiary"} />
              </Tooltip>
              <Text selectable>{webhook.name}</Text>
            </HStack>
          ),
          width: "2fr",
        },
        {
          type: "data",
          id: "url",
          header: t("URL"),
          accessor: (webhook) => webhook.url,
          component: (webhook) => (
            <UrlText type="tertiary" monospace selectable title={webhook.url}>
              {webhook.url}
            </UrlText>
          ),
          width: "3fr",
        },
        {
          type: "data",
          id: "createdById",
          header: t("Created by"),
          accessor: (webhook) => webhook.createdBy?.name,
          component: (webhook) =>
            webhook.createdBy ? (
              <HStack>
                <Avatar model={webhook.createdBy} size={AvatarSize.Medium} />
                <Text selectable>{webhook.createdBy.name}</Text>
              </HStack>
            ) : null,
          width: "2fr",
        },
        {
          type: "data",
          id: "updatedAt",
          header: t("Last updated"),
          accessor: (webhook) => webhook.updatedAt,
          component: (webhook) =>
            webhook.updatedAt ? (
              <Time dateTime={webhook.updatedAt} addSuffix shorten />
            ) : null,
          width: "1.5fr",
        },
        {
          type: "action",
          id: "action",
          component: (webhook) => <WebhookSubscriptionMenu webhook={webhook} />,
          width: "50px",
        },
      ],
      [t]
    );

    return (
      <SortableTable
        columns={columns}
        rowHeight={ROW_HEIGHT}
        stickyOffset={STICKY_OFFSET}
        decorateRow={applyContextMenu}
        {...props}
      />
    );
  }
);

const UrlText = styled(Text)`
  ${ellipsis()}
  max-width: 100%;
`;
