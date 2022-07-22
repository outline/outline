import { SmileyIcon, WarningIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import WebhookDelivery from "~/models/WebhookDelivery";
import WebhookSubscription from "~/models/WebhookSubscription";
import Flex from "~/components/Flex";
import TableFromParams from "~/components/TableFromParams";
import Time from "~/components/Time";
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

  const [deliveries, setDeliveries] = React.useState<WebhookDelivery[]>([]);

  React.useEffect(() => {
    async function fetch() {
      const resp = await webhookDeliveries.fetchPage({
        webhookSubscriptionId: webhook.id,
      });

      setDeliveries(resp);
    }
    fetch();
  }, [webhookDeliveries, webhook]);

  return (
    <div>
      <TableFromParams
        columns={[
          {
            id: "status",
            Header: t("Status"),
            accessor: "status",
            Cell: ({ value }: CellProps<string>) => (
              <Flex align="center" gap={5}>
                {value === "failed" ? <WarningIcon /> : <SmileyIcon />}
                <span>{value}</span>
              </Flex>
            ),
          },
          {
            id: "id",
            Header: t("ID"),
            accessor: "id",
            Cell: ({ value }: CellProps<string>) => value,
          },
          {
            id: "createdAt",
            Header: "",
            accessor: "createdAt",
            Cell: ({ value }: CellProps<string>) => <Time dateTime={value} />,
          },
        ]}
        data={deliveries}
        isLoading={false}
        page={0}
        defaultSortDirection="DESC"
      />
    </div>
  );
};

export default WebhookDeliveries;
