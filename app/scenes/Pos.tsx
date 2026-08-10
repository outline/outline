import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import { InputSelect } from "~/components/InputSelect";
import Text from "~/components/Text";
import { Card, CardGrid, PlainList } from "~/components/Surface";
import { useMachine } from "@xstate/react";
import { ticketMachine } from "~/machines/ticket";
import { useFields } from "~/hooks/useFields";
import { useSubmit } from "~/hooks/useSubmit";
import { CoverScreenDialog } from "~/components/CoverScreenDialog";
import useStores from "~/hooks/useStores";
import { isCovered, ScreenCover } from "~/components/ScreenCover";
import { useShop } from "~/stores/shop";
import { AppPage } from "~/components/AppPage";
import { formatCurrency } from "~/utils/format";

const Till = styled.div`
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr;

  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }
`;

const Tile = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  height: 100%;
  padding: 16px;
  text-align: left;
  border-radius: 8px;
  cursor: pointer;
  background: ${s("backgroundSecondary")};
  border: 1px solid ${s("divider")};
  color: ${s("text")};

  &:hover:not(:disabled) {
    border-color: ${s("inputBorderFocused")};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const Sku = styled.span`
  font-family: ${s("fontFamilyMono")};
  font-size: 12px;
  color: ${s("textSecondary")};
`;

const Totals = styled(Flex)`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid ${s("divider")};
`;

const Receipt = styled.p`
  margin-top: 16px;
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
  color: ${s("text")};
  background: ${s("backgroundTertiary")};
`;

/**
 * Point of sale: pick products into a ticket and take payment.
 *
 * Completing a sale writes an order and decrements stock, so the catalogue,
 * dashboard and order history all move together.
 *
 * @returns the rendered till.
 */
function Pos() {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const products = useShop((state) => state.products);
  const customers = useShop((state) => state.customers);
  const createOrder = useShop((state) => state.createOrder);

  const fields = useFields({
    query: "",
    category: "All",
    customerName: "Walk-in",
  });
  const query = fields.get("query");
  const category = fields.get("category");
  const customerName = fields.get("customerName");
  const [ticket, sendTicket] = useMachine(ticketMachine);
  const cart = ticket.context.lines;
  const [covered, setCovered] = useState(isCovered);
  const [receipt, setReceipt] = useState<string | undefined>();
  const submission = useSubmit();

  const categories = useMemo(
    () => ["All", ...new Set(products.map((product) => product.category))],
    [products]
  );

  const visible = useMemo(
    () =>
      products.filter((product) => {
        const matchesCategory =
          category === "All" || product.category === category;
        const term = query.trim().toLowerCase();
        const matchesQuery =
          !term ||
          product.name.toLowerCase().includes(term) ||
          product.sku.toLowerCase().includes(term);
        return matchesCategory && matchesQuery;
      }),
    [products, category, query]
  );

  const total = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);

  const addToCart = (productId: string, variantId?: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product) {
      return;
    }
    // A product sold in sizes is only ever added as one of them, so the stock
    // and price come from the size rather than the parent.
    const variant = variantId
      ? product.variants?.find((item) => item.id === variantId)
      : undefined;
    const available = variant ? variant.stock : product.stock;
    if (available === 0) {
      return;
    }

    setReceipt(undefined);
    // The machine holds the rule about the shelf; the scene only says what
    // is being added and how many there are.
    sendTicket({
      type: "ADD",
      available,
      line: {
        productId,
        variantId,
        name: variant ? `${product.name} ${variant.name}` : product.name,
        price: variant ? variant.price : product.price,
        quantity: 1,
      },
    });
  };

  const setQuantity = (key: string, quantity: number) =>
    sendTicket({ type: "SET_QUANTITY", key, quantity });

  const handleCheckout = () =>
    submission.run(async () => {
      if (!cart.length) {
        return undefined;
      }
      const order = await createOrder(cart, customerName);
      sendTicket({ type: "CLEAR" });
      setReceipt(order.number);
      return undefined;
    });

  if (covered) {
    return <ScreenCover onLifted={() => setCovered(false)} />;
  }

  return (
    <AppPage
      title={t("Point of sale")}
      description={t("Ring up a sale; stock and takings update as you go.")}
      actions={
        <Button
          neutral
          onClick={() =>
            dialogs.openModal({
              title: t("Cover the screen"),
              content: <CoverScreenDialog onCovered={() => setCovered(true)} />,
            })
          }
        >
          {t("Cover screen")}
        </Button>
      }
    >
      <Till>
        <div>
          <Flex align="center" gap={12} wrap>
            <Input
              type="search"
              value={query}
              onChange={(event) => fields.set("query", event.target.value)}
              placeholder={t("Search name or SKU")}
              label={t("Search products")}
              labelHidden
              margin={0}
            />
            <InputSelect
              value={category}
              onChange={(value) => fields.set("category", value)}
              label={t("Category")}
              labelHidden
              options={categories.map((option) => ({
                type: "item" as const,
                label: option,
                value: option,
              }))}
            />
          </Flex>

          <CardGrid role="list" $min={200}>
            {visible.flatMap((product) =>
              // A product sold in sizes gets a tile per size, because that is
              // what the till actually rings up.
              (product.variants ?? [undefined]).map((variant) => (
                <li key={variant?.id ?? product.id}>
                  <Tile
                    type="button"
                    onClick={() => addToCart(product.id, variant?.id)}
                    disabled={(variant ? variant.stock : product.stock) === 0}
                  >
                    <Text size="small" weight="bold">
                      {variant
                        ? `${product.name} ${variant.name}`
                        : product.name}
                    </Text>
                    <Sku>{variant ? variant.sku : product.sku}</Sku>
                    <Text size="small" weight="bold">
                      {formatCurrency(variant ? variant.price : product.price)}
                    </Text>
                    <Text
                      size="xsmall"
                      type={
                        (variant ? variant.stock : product.stock) === 0
                          ? "danger"
                          : "tertiary"
                      }
                    >
                      {(variant ? variant.stock : product.stock) === 0
                        ? t("Out of stock")
                        : `${variant ? variant.stock : product.stock} in stock`}
                    </Text>
                  </Tile>
                </li>
              ))
            )}
          </CardGrid>

          {visible.length === 0 ? (
            <Text as="p" type="tertiary" size="small">
              Nothing matches that search.
            </Text>
          ) : null}
        </div>

        <aside>
          <Card style={{ padding: 16 }}>
            <Text as="h2" weight="bold">
              Ticket
            </Text>

            <InputSelect
              value={customerName}
              onChange={(value) => fields.set("customerName", value)}
              label={t("Customer")}
              options={[
                { type: "item" as const, label: "Walk-in", value: "Walk-in" },
                ...customers.map((customer) => ({
                  type: "item" as const,
                  label: customer.name,
                  value: customer.name,
                })),
              ]}
            />

            <PlainList $divided>
              {cart.map((line) => (
                <li
                  key={line.variantId ?? line.productId}
                  style={{ padding: "12px 0" }}
                >
                  <Flex align="flex-start" justify="space-between" gap={8}>
                    <Flex column style={{ minWidth: 0 }}>
                      <Text size="small" weight="bold">
                        {line.name}
                      </Text>
                      <Text size="xsmall" type="tertiary">
                        {formatCurrency(line.price)} each
                      </Text>
                    </Flex>
                    <Text size="small" weight="bold">
                      {formatCurrency(line.price * line.quantity)}
                    </Text>
                  </Flex>
                  <Flex align="center" gap={8} style={{ marginTop: 8 }}>
                    <Button
                      neutral
                      aria-label={`Decrease ${line.name}`}
                      onClick={() =>
                        setQuantity(
                          line.variantId ?? line.productId,
                          line.quantity - 1
                        )
                      }
                    >
                      −
                    </Button>
                    <Text size="small">{line.quantity}</Text>
                    <Button
                      neutral
                      aria-label={`Increase ${line.name}`}
                      onClick={() => addToCart(line.productId, line.variantId)}
                    >
                      +
                    </Button>
                  </Flex>
                </li>
              ))}
              {cart.length === 0 ? (
                <li style={{ padding: "24px 0" }}>
                  <Text type="tertiary" size="small">
                    Pick a product to start a ticket.
                  </Text>
                </li>
              ) : null}
            </PlainList>

            <Totals align="center" justify="space-between">
              <Text type="secondary" size="small" weight="bold">
                Total
              </Text>
              <Text data-testid="pos-total" size="large" weight="bold">
                {formatCurrency(total)}
              </Text>
            </Totals>

            <Button
              onClick={() => void handleCheckout()}
              disabled={cart.length === 0 || submission.isBusy}
              style={{ marginTop: 16, width: "100%" }}
            >
              {submission.isBusy ? t("Taking payment…") : t("Charge")}
            </Button>

            {cart.length > 0 ? (
              <Button
                neutral
                onClick={() => sendTicket({ type: "CLEAR" })}
                style={{ marginTop: 8, width: "100%" }}
              >
                Clear ticket
              </Button>
            ) : null}

            {receipt ? (
              <Receipt data-testid="pos-receipt">
                Paid — receipt {receipt}
              </Receipt>
            ) : null}
          </Card>
        </aside>
      </Till>
    </AppPage>
  );
}

export default Pos;
