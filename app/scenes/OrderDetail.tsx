import { useHistory, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useShop } from "~/stores/shop";
import styled from "styled-components";
import { s } from "@shared/styles";
import { AppPage } from "~/components/AppPage";
import { useSubmit } from "~/hooks/useSubmit";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { StatusChip } from "~/components/StatusChip";
import {
  Card,
  TBody,
  THead,
  Table,
  Td,
  TdMuted,
  Th,
} from "~/components/Surface";
import { formatCurrency, formatDate } from "~/utils/format";

const TotalRow = styled.tr`
  border-top: 1px solid ${s("divider")};
`;

/**
 * A single invoice with its lines.
 *
 * @returns the rendered order detail.
 */
function OrderDetail() {
  const { t } = useTranslation();
  const history = useHistory();
  const { orderId } = useParams<{ orderId: string }>();
  const orders = useShop((state) => state.orders);
  const isLoading = useShop((state) => state.isLoading);
  const markOrderPaid = useShop((state) => state.markOrderPaid);
  const voidOrder = useShop((state) => state.voidOrder);
  const staff = useShop((state) => state.staff);
  const submission = useSubmit();

  const order = orders.find((item) => item.id === orderId);

  if (!order) {
    return (
      <AppPage title={t("Invoice")}>
        <Empty>
          {isLoading ? t("Loading…") : t("That invoice no longer exists.")}
        </Empty>
        <Flex style={{ paddingTop: 16 }}>
          <Button neutral borderOnHover onClick={() => history.push("/orders")}>
            {t("Back to orders")}
          </Button>
        </Flex>
      </AppPage>
    );
  }

  const handleVoid = () =>
    submission.run(async () => {
      const result = await voidOrder(order.id);
      if (result?.voided) {
        return undefined;
      }
      return result?.reason === "has_returns"
        ? t(
            "Something has already been returned against this order, so it cannot be voided."
          )
        : t("That order could not be voided.");
    });

  return (
    <AppPage
      title={order.number}
      description={(() => {
        const soldBy = staff.find((member) => member.id === order.soldById);
        return `${order.customerName} · ${order.channel.toUpperCase()}${
          soldBy ? ` · served by ${soldBy.name}` : ""
        }`;
      })()}
      actions={
        <Flex align="center" gap={12}>
          <StatusChip status={order.status} />
          {order.status !== "paid" && order.status !== "void" ? (
            <Button onClick={() => void markOrderPaid(order.id)}>
              {t("Mark paid")}
            </Button>
          ) : null}
          {order.status === "paid" ? (
            <Button neutral onClick={() => void handleVoid()}>
              {t("Void")}
            </Button>
          ) : null}
        </Flex>
      }
    >
      {submission.notice ? (
        <Text as="p" type="secondary" size="small" data-testid="order-notice">
          {submission.notice}
        </Text>
      ) : null}
      <Subheading>{t("The sale")}</Subheading>
      <ListItem
        title={t("Customer")}
        actions={<Text weight="bold">{order.customerName}</Text>}
        border
      />
      <ListItem
        title={t("Paid")}
        actions={
          <Text weight="bold">
            {order.paidAt ? formatDate(order.paidAt) : t("Not yet")}
          </Text>
        }
        border
      />
      <ListItem
        title={t("Status")}
        actions={<StatusChip status={order.status} />}
        border
      />

      <Subheading>{t("Lines")}</Subheading>
      <Card>
        <Table>
          <THead>
            <tr>
              {[t("Item"), t("Qty"), t("Price"), t("Amount")].map((heading) => (
                <Th key={heading} scope="col">
                  {heading}
                </Th>
              ))}
            </tr>
          </THead>
          <TBody>
            {order.items.map((item) => (
              <tr key={item.productId}>
                <Td>{item.name}</Td>
                <Td>{item.quantity}</Td>
                <Td>{formatCurrency(item.price)}</Td>
                <Td>{formatCurrency(item.price * item.quantity)}</Td>
              </tr>
            ))}
          </TBody>
          <tfoot>
            <TotalRow>
              <TdMuted colSpan={3}>{t("Total")}</TdMuted>
              <Td data-testid="order-total">
                <Text weight="bold">{formatCurrency(order.total)}</Text>
              </Td>
            </TotalRow>
          </tfoot>
        </Table>
      </Card>

      <Flex style={{ paddingTop: 16 }}>
        <Button neutral borderOnHover onClick={() => history.push("/orders")}>
          {t("Back to orders")}
        </Button>
      </Flex>
    </AppPage>
  );
}

export default OrderDetail;
