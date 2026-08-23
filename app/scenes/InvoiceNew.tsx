import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { AppPage } from "~/components/AppPage";
import { useMachine } from "@xstate/react";
import { linesMachine } from "~/machines/lines";
import { useSubmit } from "~/hooks/useSubmit";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import ListItem from "~/components/List/Item";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { useShop } from "~/stores/shop";
import type { InvoiceLine } from "~/stores/shop";
import { formatCurrency } from "~/utils/format";
/** A date input wants `yyyy-mm-dd`, not an ISO timestamp. */
const asDateValue = (date: Date) => date.toISOString().slice(0, 10);
/** Tax applied to every invoice, matching the mock's default. */
const TAX_RATE = 0.11;
/**
 * Drafting an invoice.
 *
 * Lines are added one at a time and totalled as you go, so the figure you are
 * about to bill is visible before the invoice is issued.
 *
 * @returns the rendered invoice form.
 */
function InvoiceNew() {
  const { t } = useTranslation();
  const history = useHistory();
  const customers = useShop((state) => state.customers);
  const createInvoice = useShop((state) => state.createInvoice);
  const [customerName, setCustomerName] = useState("");
  const [dueDate, setDueDate] = useState(
    asDateValue(new Date(Date.now() + 14 * 86400000))
  );
  const [notes, setNotes] = useState("");
  const [note, sendLine] = useMachine(linesMachine);
  const lines = note.context.lines as InvoiceLine[];
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [discount, setDiscount] = useState("0");
  // Adding a line is checked here and now, so it keeps its own message.
  // Issuing the invoice is a save, and that one belongs to the machine.
  const [lineNotice, setLineNotice] = useState<string | undefined>();
  const submission = useSubmit();
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity - line.discount,
    0
  );
  const tax = Math.round(subtotal * TAX_RATE);
  const handleAddLine = () => {
    if (!name.trim() || Number(unitPrice) <= 0) {
      setLineNotice(t("A line needs a description and a price."));
      return;
    }
    setLineNotice(undefined);
    sendLine({
      type: "ADD",
      line: {
        name: name.trim(),
        quantity: Math.max(1, Number(quantity) || 1),
        unitPrice: Number(unitPrice),
        discount: Math.max(0, Number(discount) || 0),
      },
    });
    setName("");
    setQuantity("1");
    setUnitPrice("");
    setDiscount("0");
  };
  const handleIssue = () =>
    void submission.run(async () => {
      setLineNotice(undefined);
      const result = await createInvoice({
        customerName: customerName.trim(),
        dueDate,
        notes: notes.trim(),
        items: lines,
        taxAmount: tax,
      });
      if (result?.created && result.invoice) {
        history.push(`/invoices/${result.invoice.id}`);
        return;
      }
      return t("Give us a customer and at least one line.");
    });
  return (
    <AppPage
      title={t("New invoice")}
      description={t("Bill a customer for work already done.")}
    >
      {(submission.notice ?? lineNotice) ? (
        <Text as="p" type="secondary" data-testid="invoice-new-notice">
          {submission.notice ?? lineNotice}
        </Text>
      ) : null}

      <Subheading>{t("Who is being billed")}</Subheading>
      <Flex gap={8} wrap align="flex-end">
        <Input
          label={t("Customer")}
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          list="invoice-customers"
        />
        <datalist id="invoice-customers">
          {customers.map((customer) => (
            <option key={customer.id} value={customer.name} />
          ))}
        </datalist>
        <Input
          type="date"
          label={t("Due")}
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          short
        />
      </Flex>

      <Subheading>{t("Lines")}</Subheading>
      {lines.map((line, index) => (
        <ListItem
          key={`${line.name}-${index}`}
          title={line.name}
          subtitle={
            <>
              {line.quantity} × {formatCurrency(line.unitPrice)}
              {line.discount > 0
                ? ` · ${t("less")} ${formatCurrency(line.discount)}`
                : ""}
            </>
          }
          actions={
            <Flex align="center" gap={8}>
              <Text weight="bold">
                {formatCurrency(line.unitPrice * line.quantity - line.discount)}
              </Text>
              <Button
                neutral
                borderOnHover
                onClick={() => sendLine({ type: "REMOVE", at: index })}
              >
                {t("Remove")}
              </Button>
            </Flex>
          }
          border
        />
      ))}

      <Flex gap={8} wrap align="flex-end">
        <Input
          label={t("Description")}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Input
          label={t("Qty")}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          short
        />
        <Input
          label={t("Unit price")}
          value={unitPrice}
          onChange={(event) => setUnitPrice(event.target.value)}
          short
        />
        <Input
          label={t("Discount")}
          value={discount}
          onChange={(event) => setDiscount(event.target.value)}
          short
        />
        <Button neutral borderOnHover onClick={handleAddLine}>
          {t("Add line")}
        </Button>
      </Flex>

      {lines.length > 0 ? (
        <Text as="p" type="secondary" data-testid="invoice-draft-total">
          {t("Subtotal")} {formatCurrency(subtotal)} · {t("tax")}{" "}
          {formatCurrency(tax)} · {t("total")} {formatCurrency(subtotal + tax)}
        </Text>
      ) : null}

      <Subheading>{t("Notes")}</Subheading>
      <Input
        type="textarea"
        label={t("Notes")}
        labelHidden
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={3}
      />

      <Flex gap={8} style={{ paddingTop: 16 }}>
        <Button onClick={handleIssue} disabled={submission.isBusy}>
          {submission.isBusy ? t("Issuing…") : t("Issue invoice")}
        </Button>
        <Button neutral borderOnHover onClick={() => history.push("/invoices")}>
          {t("Cancel")}
        </Button>
      </Flex>
    </AppPage>
  );
}
export default InvoiceNew;
