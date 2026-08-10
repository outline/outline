import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { AppPage } from "~/components/AppPage";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { StatusChip } from "~/components/StatusChip";
import { useShop } from "~/stores/shop";
import { formatCurrency, formatDate } from "~/utils/format";

/**
 * What has been ordered from suppliers and what is still to arrive.
 *
 * @returns the rendered purchase orders page.
 */
function PurchaseOrders() {
  const { t } = useTranslation();
  const history = useHistory();
  const purchaseOrders = useShop((state) => state.purchaseOrders);

  const open = purchaseOrders.filter(
    (order) => order.status !== "received" && order.status !== "cancelled"
  );
  const closed = purchaseOrders.filter(
    (order) => order.status === "received" || order.status === "cancelled"
  );

  const groups = [
    { key: "open", title: t("Still to arrive"), orders: open },
    { key: "closed", title: t("Closed"), orders: closed },
  ];

  return (
    <AppPage
      title={t("Purchase orders")}
      description={t("Stock on order, and what has been booked in.")}
      actions={
        <Button onClick={() => history.push("/purchase-orders/new")}>
          {t("New purchase order")}
        </Button>
      }
    >
      {groups.map((group) =>
        group.orders.length === 0 ? null : (
          <Flex column key={group.key}>
            <Subheading>
              {group.title} · {group.orders.length}
            </Subheading>
            {group.orders.map((order) => {
              const value = order.items.reduce(
                (sum, item) => sum + item.cost * item.quantity,
                0
              );
              const outstanding = order.items.reduce(
                (sum, item) => sum + (item.quantity - item.received),
                0
              );

              return (
                <ListItem
                  key={order.id}
                  title={
                    <>
                      {order.number}{" "}
                      <Text as="span" type="tertiary">
                        {order.supplierName}
                      </Text>
                    </>
                  }
                  subtitle={
                    <>
                      {t("expected")} {formatDate(order.expectedAt)} ·{" "}
                      {t("{{ count }} lines", { count: order.items.length })} ·{" "}
                      {formatCurrency(value)}
                      {outstanding > 0
                        ? ` · ${outstanding} ${t("still to come")}`
                        : ""}
                    </>
                  }
                  actions={
                    <Flex align="center" gap={8}>
                      <StatusChip status={order.status} />
                      <Button
                        neutral
                        borderOnHover
                        onClick={() =>
                          history.push(`/purchase-orders/${order.id}`)
                        }
                      >
                        {t("Open")}
                      </Button>
                    </Flex>
                  }
                  border
                />
              );
            })}
          </Flex>
        )
      )}

      {purchaseOrders.length === 0 ? (
        <Empty>{t("Nothing on order.")}</Empty>
      ) : null}
    </AppPage>
  );
}

export default PurchaseOrders;
