import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import ListItem from "~/components/List/Item";
import Scene from "~/components/Scene";
import { StatusChip } from "~/components/StatusChip";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { useShop } from "~/stores/shop";
import { formatCurrency, formatDate } from "~/utils/format";

const PLANS = [
  { id: "free", name: "Free", price: 0 },
  { id: "pro", name: "Pro", price: 499000 },
  { id: "business", name: "Business", price: 1290000 },
] as const;

/**
 * The workspace subscription: which plan is in force, how much of it is being
 * used, and the invoices behind it.
 *
 * Usage is counted from live records – staff, branches and boardings – rather
 * than tracked separately, so it cannot drift from what the app actually holds.
 *
 * @returns the rendered billing settings.
 */
function Billing() {
  const { t } = useTranslation();
  const fetchAll = useShop((state) => state.fetchAll);
  const subscription = useShop((state) => state.subscription);
  const invoices = useShop((state) => state.billingInvoices);
  const usage = useShop((state) => state.usage);
  const changePlan = useShop((state) => state.changePlan);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const rows = usage
    ? [
        { name: t("Staff"), ...usage.staff },
        { name: t("Branches"), ...usage.branches },
        { name: t("Boardings this month"), ...usage.boardings },
      ]
    : [];

  return (
    <Scene title={t("Billing")}>
      <Heading>{t("Billing")}</Heading>
      <Text as="p" type="secondary">
        {t("The plan this workspace is on, and what it is using.")}
      </Text>

      {subscription ? (
        <>
          <Subheading>{t("Plan")}</Subheading>
          <ListItem
            title={
              <span style={{ textTransform: "capitalize" }}>
                {subscription.plan}
              </span>
            }
            subtitle={
              <>
                {formatCurrency(subscription.price)} /{" "}
                {t(subscription.interval)} · {t("renews")}{" "}
                {formatDate(subscription.renewsAt)}
              </>
            }
            actions={<StatusChip status={subscription.status} />}
            border
          />

          <Subheading>{t("Usage")}</Subheading>
          {rows.map((row) => (
            <ListItem
              key={row.name}
              title={row.name}
              subtitle={
                row.used > row.limit
                  ? t("Over the plan limit")
                  : t("{{remaining}} remaining", {
                      remaining: row.limit - row.used,
                    })
              }
              actions={
                <Text weight="bold">
                  {row.used} / {row.limit}
                </Text>
              }
              border
            />
          ))}

          <Subheading>{t("Change plan")}</Subheading>
          <Flex gap={8} style={{ padding: "8px 0 16px" }}>
            {PLANS.map((plan) => (
              <Button
                key={plan.id}
                neutral={subscription.plan !== plan.id}
                borderOnHover={subscription.plan !== plan.id}
                disabled={subscription.plan === plan.id}
                onClick={() => void changePlan(plan.id)}
              >
                {plan.name} · {formatCurrency(plan.price)}
              </Button>
            ))}
          </Flex>
        </>
      ) : null}

      <Subheading>{t("Invoices")}</Subheading>
      {invoices.map((invoice) => (
        <ListItem
          key={invoice.id}
          title={invoice.number}
          subtitle={formatDate(invoice.date)}
          actions={
            <Flex align="center" gap={8}>
              <Text weight="bold">{formatCurrency(invoice.amount)}</Text>
              <StatusChip status={invoice.status} />
            </Flex>
          }
          border
        />
      ))}
      {invoices.length === 0 ? <Empty>{t("No invoices yet.")}</Empty> : null}
    </Scene>
  );
}

export default Billing;
