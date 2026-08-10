import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppPage } from "~/components/AppPage";
import { useSubmit } from "~/hooks/useSubmit";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import { InputSelect } from "~/components/InputSelect";
import ListItem from "~/components/List/Item";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { useShop } from "~/stores/shop";
import { formatCurrency, formatDate } from "~/utils/format";

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank transfer" },
];

/**
 * Goods handed back, and the money given back for them.
 *
 * How many of a line are still refundable is worked out from the order less
 * whatever earlier returns already took, so the same item cannot be refunded
 * twice.
 *
 * @returns the rendered returns page.
 */
function Returns() {
  const { t } = useTranslation();
  const orders = useShop((state) => state.orders);
  const returns = useShop((state) => state.returns);
  const createReturn = useShop((state) => state.createReturn);

  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState("cash");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [damaged, setDamaged] = useState<Record<string, boolean>>({});
  const submission = useSubmit();

  const paidOrders = orders.filter((order) => order.status === "paid");
  const selected = paidOrders.find((order) => order.id === orderId);

  /** A line is identified by its size when it has one. */
  const keyOf = (line: { productId: string; variantId?: string }) =>
    line.variantId ?? line.productId;

  /** How many of a line have not been handed back yet. */
  const refundable = (line: { productId: string; variantId?: string }) => {
    if (!selected) {
      return 0;
    }
    const key = keyOf(line);
    const bought =
      selected.items.find((item) => keyOf(item) === key)?.quantity ?? 0;
    const returned = returns
      .filter((item) => item.orderId === selected.id)
      .flatMap((item) => item.items)
      .filter((item) => keyOf(item) === key)
      .reduce((sum, item) => sum + item.quantity, 0);
    return bought - returned;
  };

  const handleSubmit = () =>
    submission.run(async () => {
      if (!selected) {
        return t("Choose the order the goods came from.");
      }

      const items = selected.items
        .map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: Number(quantities[keyOf(item)] ?? 0),
          isDamaged: Boolean(damaged[keyOf(item)]),
        }))
        .filter((item) => item.quantity > 0);

      const result = await createReturn({
        orderId: selected.id,
        reason: reason.trim(),
        refundMethod: method === "bank" ? "bank" : "cash",
        items,
      });

      if (result?.created) {
        setQuantities({});
        setDamaged({});
        setReason("");
        return t("Refund recorded.");
      }
      if (result?.reason === "too_many") {
        return t("Only {{count}} of that line can still be returned.", {
          count: result.refundable ?? 0,
        });
      }
      return t("Say how many of what is coming back.");
    });

  const refunded = returns.reduce((sum, item) => sum + item.refundAmount, 0);

  return (
    <AppPage
      title={t("Returns")}
      description={t("Goods handed back, and what was refunded for them.")}
      actions={
        <Text type="tertiary" size="small">
          {returns.length} {returns.length === 1 ? t("return") : t("returns")} ·{" "}
          {formatCurrency(refunded)}
        </Text>
      }
    >
      {submission.notice ? (
        <Text as="p" type="secondary" data-testid="returns-notice">
          {submission.notice}
        </Text>
      ) : null}

      <Subheading>{t("Take something back")}</Subheading>
      <Flex gap={8} wrap align="flex-end">
        <InputSelect
          label={t("Order")}
          value={orderId}
          onChange={setOrderId}
          options={paidOrders.map((order) => ({
            type: "item",
            label: `${order.number} · ${order.customerName}`,
            value: order.id,
          }))}
        />
        <InputSelect
          label={t("Refund by")}
          value={method}
          onChange={setMethod}
          options={METHODS.map((option) => ({
            type: "item",
            label: t(option.label),
            value: option.value,
          }))}
        />
        <Input
          label={t("Reason")}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          // Input carries a bottom margin that InputSelect does not, which
          // bottom-aligns the margin rather than the field.
          margin={0}
        />
      </Flex>

      {selected ? (
        <>
          {selected.items.map((item) => {
            const left = refundable(item);
            return (
              <ListItem
                key={keyOf(item)}
                title={item.name}
                subtitle={
                  <>
                    {item.quantity} {t("bought")} · {left}{" "}
                    {t("still returnable")} · {formatCurrency(item.price)}{" "}
                    {t("each")}
                  </>
                }
                actions={
                  left > 0 ? (
                    <Flex align="center" gap={8}>
                      <Input
                        label={t("Back")}
                        labelHidden
                        placeholder="0"
                        value={quantities[keyOf(item)] ?? ""}
                        onChange={(event) =>
                          setQuantities({
                            ...quantities,
                            [keyOf(item)]: event.target.value,
                          })
                        }
                        short
                      />
                      <Button
                        neutral={!damaged[keyOf(item)]}
                        borderOnHover
                        onClick={() =>
                          setDamaged({
                            ...damaged,
                            [keyOf(item)]: !damaged[keyOf(item)],
                          })
                        }
                      >
                        {damaged[keyOf(item)] ? t("Damaged") : t("Resalable")}
                      </Button>
                    </Flex>
                  ) : (
                    <Text type="tertiary" size="small">
                      {t("All returned")}
                    </Text>
                  )
                }
                border
              />
            );
          })}
          <Flex gap={8} style={{ paddingTop: 16 }}>
            <Button onClick={handleSubmit}>{t("Record refund")}</Button>
            <Text type="tertiary" size="small">
              {t("Damaged goods are refunded but not put back on the shelf.")}
            </Text>
          </Flex>
        </>
      ) : null}

      <Subheading>{t("Already returned")}</Subheading>
      {returns.map((item) => (
        <ListItem
          key={item.id}
          title={
            <>
              {item.orderNumber}{" "}
              <Text as="span" type="tertiary">
                {item.customerName}
              </Text>
            </>
          }
          subtitle={
            <>
              {formatDate(item.createdAt)} ·{" "}
              {item.items
                .map(
                  (line) =>
                    `${line.quantity} × ${line.name}${
                      line.isDamaged ? ` (${t("damaged")})` : ""
                    }`
                )
                .join(", ")}
              {item.reason ? ` · ${item.reason}` : ""}
            </>
          }
          actions={
            <Text weight="bold">{formatCurrency(item.refundAmount)}</Text>
          }
          border
        />
      ))}
      {returns.length === 0 ? (
        <Empty>{t("Nothing has been brought back.")}</Empty>
      ) : null}
    </AppPage>
  );
}

export default Returns;
