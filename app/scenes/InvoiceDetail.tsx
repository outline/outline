import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useParams } from "react-router-dom";
import { AppPage } from "~/components/AppPage";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import { InputSelect } from "~/components/InputSelect";
import ListItem from "~/components/List/Item";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { StatusChip } from "~/components/StatusChip";
import { useShop } from "~/stores/shop";
import { formatCurrency, formatDate } from "~/utils/format";

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank transfer" },
];

/**
 * One invoice, its lines, and what has been paid against it.
 *
 * Recording a payment is the whole point of the page, so the form sits under
 * the balance rather than behind a dialog.
 *
 * @returns the rendered invoice detail.
 */
function InvoiceDetail() {
  const { t } = useTranslation();
  const history = useHistory();
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const invoices = useShop((state) => state.invoices);
  const isLoading = useShop((state) => state.isLoading);
  const recordInvoicePayment = useShop((state) => state.recordInvoicePayment);
  const voidInvoice = useShop((state) => state.voidInvoice);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notice, setNotice] = useState<string | undefined>();

  const invoice = invoices.find((item) => item.id === invoiceId);

  if (!invoice) {
    return (
      <AppPage title={t("Invoice")}>
        <Empty>
          {isLoading ? t("Loading…") : t("That invoice no longer exists.")}
        </Empty>
        <Flex style={{ paddingTop: 16 }}>
          <Button
            neutral
            borderOnHover
            onClick={() => history.push("/invoices")}
          >
            {t("Back to invoices")}
          </Button>
        </Flex>
      </AppPage>
    );
  }

  const handlePay = async () => {
    setNotice(undefined);
    const value = Number(amount);
    const result = await recordInvoicePayment(
      invoice.id,
      value,
      method === "bank" ? "bank" : "cash",
      reference.trim()
    );

    if (result?.recorded) {
      setAmount("");
      setReference("");
      setNotice(t("Payment recorded."));
      return;
    }
    if (result?.reason === "overpay") {
      setNotice(
        t("That is more than the {{due}} still owed.", {
          due: formatCurrency(result.due ?? 0),
        })
      );
      return;
    }
    setNotice(t("Enter an amount to record."));
  };

  const handleVoid = async () => {
    setNotice(undefined);
    const result = await voidInvoice(invoice.id);
    if (!result?.voided) {
      setNotice(
        result?.reason === "has_payments"
          ? t("It has been paid against, so it cannot be voided.")
          : t("That invoice could not be voided.")
      );
    }
  };

  return (
    <AppPage
      title={invoice.number}
      description={`${invoice.customerName} · ${t("due")} ${formatDate(
        invoice.dueDate
      )}`}
      actions={
        <Flex align="center" gap={8}>
          <StatusChip status={invoice.status} />
          {invoice.status === "unpaid" ? (
            <Button neutral borderOnHover onClick={handleVoid}>
              {t("Void")}
            </Button>
          ) : null}
        </Flex>
      }
    >
      {notice ? (
        <Text as="p" type="secondary" data-testid="invoice-notice">
          {notice}
        </Text>
      ) : null}

      <Subheading>{t("Lines")}</Subheading>
      {invoice.items.map((item, index) => (
        <ListItem
          key={`${item.name}-${index}`}
          title={item.name}
          subtitle={
            <>
              {item.quantity} × {formatCurrency(item.unitPrice)}
              {item.discount > 0
                ? ` · ${t("less")} ${formatCurrency(item.discount)}`
                : ""}
            </>
          }
          actions={
            <Text weight="bold">
              {formatCurrency(item.unitPrice * item.quantity - item.discount)}
            </Text>
          }
          border
        />
      ))}

      <Subheading>{t("Balance")}</Subheading>
      <ListItem
        title={t("Subtotal")}
        actions={<Text weight="bold">{formatCurrency(invoice.subtotal)}</Text>}
        border
      />
      <ListItem
        title={`${t("Tax")} ${Math.round(invoice.taxRate * 100)}%`}
        actions={<Text weight="bold">{formatCurrency(invoice.tax)}</Text>}
        border
      />
      <ListItem
        title={t("Total")}
        actions={<Text weight="bold">{formatCurrency(invoice.total)}</Text>}
        border
      />
      <ListItem
        title={t("Paid")}
        actions={<Text weight="bold">{formatCurrency(invoice.paid)}</Text>}
        border
      />
      <ListItem
        title={t("Still owed")}
        subtitle={invoice.isOverdue ? t("Past the due date") : undefined}
        actions={
          <Text weight="bold" data-testid="invoice-due">
            {formatCurrency(invoice.due)}
          </Text>
        }
        border
      />

      <Subheading>{t("Payments")}</Subheading>
      {invoice.payments.length === 0 ? (
        <Empty>{t("Nothing paid yet.")}</Empty>
      ) : (
        invoice.payments.map((payment) => (
          <ListItem
            key={payment.id}
            title={formatCurrency(payment.amount)}
            subtitle={
              <>
                {formatDate(payment.date)} · {t(payment.method)}
                {payment.reference ? ` · ${payment.reference}` : ""}
              </>
            }
            border
          />
        ))
      )}

      {invoice.due > 0 && invoice.status !== "void" ? (
        <>
          <Subheading>{t("Record a payment")}</Subheading>
          <Flex gap={8} wrap align="flex-end">
            <Input
              label={t("Amount")}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              short
            />
            <InputSelect
              label={t("Method")}
              value={method}
              onChange={setMethod}
              options={METHODS.map((option) => ({
                type: "item",
                label: t(option.label),
                value: option.value,
              }))}
            />
            <Input
              label={t("Reference")}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              short
            />
            <Button onClick={handlePay}>{t("Record")}</Button>
          </Flex>
        </>
      ) : null}

      {invoice.notes ? (
        <>
          <Subheading>{t("Notes")}</Subheading>
          <Text as="p" type="secondary">
            {invoice.notes}
          </Text>
        </>
      ) : null}

      <Flex style={{ paddingTop: 16 }}>
        <Button neutral borderOnHover onClick={() => history.push("/invoices")}>
          {t("Back to invoices")}
        </Button>
      </Flex>
    </AppPage>
  );
}

export default InvoiceDetail;
