import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useParams } from "react-router-dom";
import { AppPage } from "~/components/AppPage";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import ListItem from "~/components/List/Item";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { StatusChip } from "~/components/StatusChip";
import { useShop } from "~/stores/shop";
import { formatCurrency, formatDate } from "~/utils/format";

/**
 * One purchase order, and booking in what has turned up.
 *
 * Deliveries arrive in parts, so each line takes its own quantity rather than
 * the whole order being received at once. What is left outstanding drives the
 * form, and the mock refuses anything above it.
 *
 * @returns the rendered purchase order detail.
 */
function PurchaseOrderDetail() {
  const { t } = useTranslation();
  const history = useHistory();
  const { purchaseOrderId } = useParams<{ purchaseOrderId: string }>();
  const purchaseOrders = useShop((state) => state.purchaseOrders);
  const isLoading = useShop((state) => state.isLoading);
  const receivePurchaseOrder = useShop((state) => state.receivePurchaseOrder);

  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | undefined>();

  const order = purchaseOrders.find((item) => item.id === purchaseOrderId);

  if (!order) {
    return (
      <AppPage title={t("Purchase order")}>
        <Empty>
          {isLoading ? t("Loading…") : t("That order no longer exists.")}
        </Empty>
        <Flex style={{ paddingTop: 16 }}>
          <Button
            neutral
            borderOnHover
            onClick={() => history.push("/purchase-orders")}
          >
            {t("Back to purchase orders")}
          </Button>
        </Flex>
      </AppPage>
    );
  }

  const value = order.items.reduce(
    (sum, item) => sum + item.cost * item.quantity,
    0
  );
  const outstanding = order.items.reduce(
    (sum, item) => sum + (item.quantity - item.received),
    0
  );
  const isOpen = order.status !== "received" && order.status !== "cancelled";

  const handleReceive = async () => {
    setNotice(undefined);
    const asked: Record<string, number> = {};
    order.items.forEach((item) => {
      const typed = quantities[item.productId];
      if (typed !== undefined && typed !== "") {
        asked[item.productId] = Number(typed);
      }
    });

    const result = await receivePurchaseOrder(
      order.id,
      Object.keys(asked).length > 0 ? asked : undefined
    );

    if (result?.received) {
      setQuantities({});
      setNotice(t("Booked in."));
      return;
    }
    setNotice(
      result?.reason === "nothing_to_receive"
        ? t("Nothing to book in.")
        : t("That delivery could not be booked in.")
    );
  };

  return (
    <AppPage
      title={order.number}
      description={`${order.supplierName} · ${t("expected")} ${formatDate(
        order.expectedAt
      )}`}
      actions={<StatusChip status={order.status} />}
    >
      {notice ? (
        <Text as="p" type="secondary" data-testid="po-notice">
          {notice}
        </Text>
      ) : null}

      <Subheading>{t("Ordered")}</Subheading>
      {order.items.map((item) => (
        <ListItem
          key={item.productId}
          title={item.name}
          subtitle={
            <>
              {item.received} / {item.quantity} {t("received")} ·{" "}
              {formatCurrency(item.cost)} {t("each")}
            </>
          }
          actions={
            <Flex align="center" gap={8}>
              <Text weight="bold">
                {formatCurrency(item.cost * item.quantity)}
              </Text>
              {isOpen && item.received < item.quantity ? (
                <Input
                  label={t("Arriving")}
                  labelHidden
                  placeholder={`${item.quantity - item.received}`}
                  value={quantities[item.productId] ?? ""}
                  onChange={(event) =>
                    setQuantities({
                      ...quantities,
                      [item.productId]: event.target.value,
                    })
                  }
                  short
                />
              ) : null}
            </Flex>
          }
          border
        />
      ))}

      <ListItem
        title={t("Order value")}
        subtitle={`${outstanding} ${t("still to come")}`}
        actions={<Text weight="bold">{formatCurrency(value)}</Text>}
        border
      />

      {isOpen ? (
        <Flex gap={8} style={{ paddingTop: 16 }}>
          <Button onClick={handleReceive}>{t("Book in delivery")}</Button>
          <Text type="tertiary" size="small">
            {t("Leave a line blank to book in everything outstanding on it.")}
          </Text>
        </Flex>
      ) : null}

      <Flex style={{ paddingTop: 16 }}>
        <Button
          neutral
          borderOnHover
          onClick={() => history.push("/purchase-orders")}
        >
          {t("Back to purchase orders")}
        </Button>
      </Flex>
    </AppPage>
  );
}

export default PurchaseOrderDetail;
