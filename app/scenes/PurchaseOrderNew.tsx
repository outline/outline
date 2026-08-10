import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { AppPage } from "~/components/AppPage";
import { useSubmit } from "~/hooks/useSubmit";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import { InputSelect } from "~/components/InputSelect";
import ListItem from "~/components/List/Item";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { useShop } from "~/stores/shop";
import { formatCurrency } from "~/utils/format";

/** A date input wants `yyyy-mm-dd`, not an ISO timestamp. */
const asDateValue = (date: Date) => date.toISOString().slice(0, 10);

type Line = {
  productId: string;
  variantId?: string;
  name: string;
  quantity: number;
  cost: number;
};

/**
 * Raising a purchase order.
 *
 * Lines are picked from the catalogue rather than typed, so what arrives can
 * be booked against a real product when the delivery turns up.
 *
 * @returns the rendered purchase order form.
 */
function PurchaseOrderNew() {
  const { t } = useTranslation();
  const history = useHistory();
  const suppliers = useShop((state) => state.suppliers);
  const products = useShop((state) => state.products);
  const createPurchaseOrder = useShop((state) => state.createPurchaseOrder);

  const [supplierId, setSupplierId] = useState("");
  const [expectedAt, setExpectedAt] = useState(
    asDateValue(new Date(Date.now() + 7 * 86400000))
  );
  const [lines, setLines] = useState<Line[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [cost, setCost] = useState("");
  // Adding a line is checked here and now, so it keeps its own message.
  // Raising the order is a save, and that one belongs to the machine.
  const [lineNotice, setLineNotice] = useState<string | undefined>();
  const submission = useSubmit();

  const value = lines.reduce((sum, line) => sum + line.cost * line.quantity, 0);

  const handleAddLine = () => {
    // The picker offers a size of its own for anything sold in sizes, so the
    // delivery can be booked in against the right one.
    const [chosenProductId, chosenVariantId] = productId.split("::");
    const product = products.find((item) => item.id === chosenProductId);
    const variant = product?.variants?.find(
      (item) => item.id === chosenVariantId
    );
    if (!product || Number(cost) <= 0) {
      setLineNotice(t("A line needs a product and a unit cost."));
      return;
    }
    setLineNotice(undefined);
    setLines([
      ...lines,
      {
        productId: product.id,
        variantId: variant?.id,
        name: variant ? `${product.name} ${variant.name}` : product.name,
        quantity: Math.max(1, Number(quantity) || 1),
        cost: Number(cost),
      },
    ]);
    setProductId("");
    setQuantity("1");
    setCost("");
  };

  const handleRaise = () =>
    void submission.run(async () => {
      setLineNotice(undefined);
      const result = await createPurchaseOrder({
        supplierId,
        expectedAt,
        items: lines,
      });

      if (result?.created && result.order) {
        history.push(`/purchase-orders/${result.order.id}`);
        return;
      }
      return t("Choose a supplier and add at least one line.");
    });

  return (
    <AppPage
      title={t("New purchase order")}
      description={t("Order stock from a supplier.")}
    >
      {(submission.notice ?? lineNotice) ? (
        <Text as="p" type="secondary" data-testid="po-new-notice">
          {submission.notice ?? lineNotice}
        </Text>
      ) : null}

      <Subheading>{t("Supplier")}</Subheading>
      <Flex gap={8} wrap align="flex-end">
        <InputSelect
          label={t("Supplier")}
          value={supplierId}
          onChange={setSupplierId}
          options={suppliers.map((supplier) => ({
            type: "item",
            label: `${supplier.name} · ${supplier.terms}`,
            value: supplier.id,
          }))}
        />
        <Input
          type="date"
          label={t("Expected")}
          value={expectedAt}
          onChange={(event) => setExpectedAt(event.target.value)}
          short
        />
      </Flex>

      <Subheading>{t("Lines")}</Subheading>
      {lines.map((line, index) => (
        <ListItem
          key={`${line.productId}-${index}`}
          title={line.name}
          subtitle={
            <>
              {line.quantity} × {formatCurrency(line.cost)}
            </>
          }
          actions={
            <Flex align="center" gap={8}>
              <Text weight="bold">
                {formatCurrency(line.cost * line.quantity)}
              </Text>
              <Button
                neutral
                borderOnHover
                onClick={() =>
                  setLines(lines.filter((_, position) => position !== index))
                }
              >
                {t("Remove")}
              </Button>
            </Flex>
          }
          border
        />
      ))}

      <Flex gap={8} wrap align="flex-end">
        <InputSelect
          label={t("Product")}
          value={productId}
          onChange={setProductId}
          options={products.flatMap((product) =>
            (product.variants ?? [undefined]).map((variant) => ({
              type: "item" as const,
              label: variant
                ? `${product.name} ${variant.name} · ${variant.sku}`
                : `${product.name} · ${product.sku}`,
              value: variant ? `${product.id}::${variant.id}` : product.id,
            }))
          )}
        />
        <Input
          label={t("Qty")}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          short
        />
        <Input
          label={t("Unit cost")}
          value={cost}
          onChange={(event) => setCost(event.target.value)}
          short
        />
        <Button neutral borderOnHover onClick={handleAddLine}>
          {t("Add line")}
        </Button>
      </Flex>

      {lines.length > 0 ? (
        <Text as="p" type="secondary" data-testid="po-draft-total">
          {t("Order value")} {formatCurrency(value)}
        </Text>
      ) : null}

      <Flex gap={8} style={{ paddingTop: 16 }}>
        <Button onClick={handleRaise} disabled={submission.isBusy}>
          {submission.isBusy ? t("Raising…") : t("Raise order")}
        </Button>
        <Button
          neutral
          borderOnHover
          onClick={() => history.push("/purchase-orders")}
        >
          {t("Cancel")}
        </Button>
      </Flex>
    </AppPage>
  );
}

export default PurchaseOrderNew;
