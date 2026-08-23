import { useTranslation } from "react-i18next";
import { AppPage } from "~/components/AppPage";
import { useFields } from "~/hooks/useFields";
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
/**
 * The tier a points balance falls into.
 *
 * Tiers come from the shop's own settings rather than being fixed here, so
 * what the page says matches what the shop actually operates.
 *
 * @param points the customer's balance.
 * @param tiers the configured tiers, highest first.
 * @returns the tier name, or empty when no tier covers the balance.
 */
function tierFor(
  points: number,
  tiers: {
    name: string;
    from: number;
  }[]
): string {
  return tiers.find((tier) => points >= tier.from)?.name ?? "";
}
/**
 * Loyalty standing per customer, and the ledger of how they got there.
 *
 * Balances are shown in points, not money: redeeming deducts points and
 * converts no cash, so the shop has not set a rate to convert them at.
 *
 * @returns the rendered loyalty page.
 */
function Loyalty() {
  const { t } = useTranslation();
  const customers = useShop((state) => state.customers);
  const loyalty = useShop((state) => state.loyalty);
  const redeemPoints = useShop((state) => state.redeemPoints);
  const config = useShop((state) => state.loyaltyConfig);
  const fields = useFields({ customerId: "", points: "" });
  const submission = useSubmit();
  const selected = fields.get("customerId") || customers[0]?.id || "";
  const handleRedeem = () =>
    submission.run(async () => {
      const value = Number(fields.get("points"));
      if (!value || !selected) {
        return undefined;
      }
      const redeemed = await redeemPoints(selected, value);
      const name = customers.find((item) => item.id === selected)?.name ?? "";
      fields.set("points", "");
      return redeemed
        ? t("Redeemed {{points}} points for {{name}}.", {
            points: value,
            name,
          })
        : t("{{name}} does not have {{points}} points.", {
            name,
            points: value,
          });
    });
  const outstanding = customers.reduce(
    (total, customer) => total + customer.loyaltyPoints,
    0
  );
  return (
    <AppPage
      title={t("Loyalty")}
      description={t("Points earned, tiers, and what has been redeemed.")}
      actions={
        // Balances stay in points: the shop sets what a point costs to earn,
        // but nothing says what one is worth back, so no rupiah figure is put
        // against a balance.
        <Text type="tertiary" size="small">
          {outstanding.toLocaleString("id-ID")} {t("points outstanding")} ·{" "}
          {customers.length}{" "}
          {customers.length === 1 ? t("member") : t("members")}
          {config
            ? ` · ${t("1 point per")} ${formatCurrency(config.rupiahPerPoint)}`
            : ""}
        </Text>
      }
    >
      {submission.notice ? (
        <Text as="p" type="secondary" data-testid="loyalty-notice">
          {submission.notice}
        </Text>
      ) : null}

      <Subheading>{t("Members")}</Subheading>
      {customers.map((customer) => (
        <ListItem
          key={customer.id}
          title={customer.name}
          subtitle={
            <>
              {tierFor(customer.loyaltyPoints, config?.tiers ?? [])} ·{" "}
              {customer.email} · {customer.pets.length}{" "}
              {customer.pets.length === 1 ? t("pet") : t("pets")}
            </>
          }
          actions={
            <Text weight="bold">
              {customer.loyaltyPoints.toLocaleString("id-ID")} {t("pts")}
            </Text>
          }
          border
        />
      ))}
      {customers.length === 0 ? <Empty>{t("No members.")}</Empty> : null}

      <Subheading>{t("Redeem")}</Subheading>
      <Flex align="flex-end" gap={8} style={{ padding: "8px 0 16px" }}>
        <InputSelect
          label={t("Customer")}
          value={selected}
          onChange={(value) => fields.set("customerId", value)}
          options={customers.map((customer) => ({
            type: "item",
            label: customer.name,
            value: customer.id,
          }))}
        />
        <Input
          label={t("Points")}
          value={fields.get("points")}
          onChange={(event) => fields.set("points", event.target.value)}
          short
        />
        <Button onClick={() => void handleRedeem()}>{t("Redeem")}</Button>
      </Flex>

      <Subheading>{t("Ledger")}</Subheading>
      {loyalty.map((movement) => (
        <ListItem
          key={movement.id}
          title={movement.customerName}
          subtitle={`${movement.reason} · ${formatDate(movement.date)}`}
          actions={
            <Text weight="bold">
              {movement.points > 0
                ? `+${movement.points.toLocaleString("id-ID")}`
                : movement.points.toLocaleString("id-ID")}
            </Text>
          }
          border
        />
      ))}
      {loyalty.length === 0 ? <Empty>{t("Nothing earned yet.")}</Empty> : null}
    </AppPage>
  );
}
export default Loyalty;
