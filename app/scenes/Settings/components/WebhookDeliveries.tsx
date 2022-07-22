import * as React from "react";
import { useTranslation } from "react-i18next";
import { WebhookDelivery } from "@server/models";
import WebhookSubscription from "~/models/WebhookSubscription";
import TableFromParams from "~/components/TableFromParams";
import useStores from "~/hooks/useStores";

type Props = {
  webhook: WebhookSubscription;
};

type CellProps<T> = {
  value: T;
  row: { original: WebhookDelivery };
};

const WebhookDeliveries = ({ webhook }: Props) => {
  const { t } = useTranslation();

  const { webhookDeliveries } = useStores();

  React.useEffect(() => {
    webhookDeliveries.fetchPage({ webhookSubscriptionId: webhook.id });
  }, [webhookDeliveries, webhook]);

  return (
    <div>
      <h1>{webhook.name}</h1>
      <p>This is a list of webhook deliveries.</p>

      <TableFromParams
        columns={[
          {
            id: "id",
            Header: t("ID"),
            accessor: "id",
            Cell: ({ value }: CellProps<string>) => value,
          },
        ]}
        data={webhookDeliveries.orderedData}
        isLoading={false}
        page={0}
        defaultSortDirection="DESC"
      />
    </div>
  );
};

export default WebhookDeliveries;
