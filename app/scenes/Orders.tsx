import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useShop } from "~/stores/shop";
import { AppPage } from "~/components/AppPage";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import { StatusChip } from "~/components/StatusChip";
import {
  Card,
  TBody,
  THead,
  Table,
  Td,
  TdMuted,
  TextLink,
  Th,
} from "~/components/Surface";
import { formatCurrency, formatDate } from "~/utils/format";

const FILTERS = ["All", "Paid", "Unpaid"] as const;

/**
 * Sales history. Anything still in draft is an unpaid invoice and can be
 * settled from here.
 *
 * @returns the rendered orders list.
 */
function Orders() {
  const { t } = useTranslation();
  const orders = useShop((state) => state.orders);
  const markOrderPaid = useShop((state) => state.markOrderPaid);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const visible = orders.filter((order) => {
    if (filter === "Paid") {
      return order.status === "paid";
    }
    if (filter === "Unpaid") {
      return order.status !== "paid";
    }
    return true;
  });

  const outstanding = orders
    .filter((order) => order.status !== "paid")
    .reduce((total, order) => total + order.total, 0);

  return (
    <AppPage
      title={t("Orders")}
      description={t("Every sale, from the till and online.")}
      actions={
        <Text type="secondary" size="small">
          {t("Outstanding")} {formatCurrency(outstanding)}
        </Text>
      }
    >
      <Flex gap={8} style={{ marginBottom: 16 }}>
        {FILTERS.map((option) => (
          <Button
            key={option}
            neutral={filter !== option}
            onClick={() => setFilter(option)}
          >
            {option}
          </Button>
        ))}
      </Flex>

      <Card>
        <Table>
          <THead>
            <tr>
              {[
                "Invoice",
                "Customer",
                "Channel",
                "Date",
                "Total",
                "Status",
                "",
              ].map((heading) => (
                <Th key={heading} scope="col">
                  {heading}
                </Th>
              ))}
            </tr>
          </THead>
          <TBody>
            {visible.map((order) => (
              <tr key={order.id}>
                <Td>
                  <TextLink as={Link} to={`/orders/${order.id}`}>
                    {order.number}
                  </TextLink>
                </Td>
                <Td>{order.customerName}</Td>
                <TdMuted style={{ textTransform: "uppercase" }}>
                  {order.channel}
                </TdMuted>
                <Td>{order.paidAt ? formatDate(order.paidAt) : "—"}</Td>
                <Td>{formatCurrency(order.total)}</Td>
                <Td>
                  <StatusChip status={order.status} />
                </Td>
                <Td style={{ textAlign: "right" }}>
                  {order.status !== "paid" ? (
                    <Button onClick={() => void markOrderPaid(order.id)}>
                      Mark paid
                    </Button>
                  ) : null}
                </Td>
              </tr>
            ))}
          </TBody>
        </Table>
        {visible.length === 0 ? (
          <Empty style={{ padding: "24px 16px" }}>{t("No orders here.")}</Empty>
        ) : null}
      </Card>
    </AppPage>
  );
}

export default Orders;
