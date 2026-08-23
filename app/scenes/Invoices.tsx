import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { AppPage } from "~/components/AppPage";
import { usePanel } from "~/hooks/usePanel";
import Button from "~/components/Button";
import { Tab, Tabs } from "~/components/Tabs";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { StatusChip } from "~/components/StatusChip";
import { useShop } from "~/stores/shop";
import { formatCurrency, formatDate } from "~/utils/format";
const TABS = ["All", "Unpaid", "Partial", "Paid", "Void"] as const;
/**
 * Money owed to the shop.
 *
 * Unlike an order, an invoice is a debt: it is issued, then paid off in one go
 * or in parts. What is still owed drives the list, so overdue work rises to
 * the top of the reading rather than being buried in a status column.
 *
 * @returns the rendered invoices page.
 */
function Invoices() {
  const { t } = useTranslation();
  const history = useHistory();
  const invoices = useShop((state) => state.invoices);
  const tabs = usePanel<(typeof TABS)[number]>("All");
  const tab = tabs.current ?? "All";
  const shown =
    tab === "All"
      ? invoices
      : invoices.filter((invoice) => invoice.status === tab.toLowerCase());
  const owed = invoices
    .filter((invoice) => invoice.status !== "void")
    .reduce((sum, invoice) => sum + invoice.due, 0);
  const overdue = invoices
    .filter((invoice) => invoice.isOverdue)
    .reduce((sum, invoice) => sum + invoice.due, 0);
  return (
    <AppPage
      title={t("Invoices")}
      description={t("What has been billed, and what is still owed.")}
      actions={
        <Button onClick={() => history.push("/invoices/new")}>
          {t("New invoice")}
        </Button>
      }
    >
      <Text as="p" type="secondary">
        {t("Outstanding")} {formatCurrency(owed)}
        {overdue > 0 ? (
          <>
            {" · "}
            {t("overdue")} {formatCurrency(overdue)}
          </>
        ) : null}
      </Text>

      <Tabs>
        {TABS.map((option) => (
          <Tab
            key={option}
            active={tab === option}
            onClick={() => tabs.open(option)}
          >
            {t(option)}
          </Tab>
        ))}
      </Tabs>

      <Subheading>
        {t(tab)} · {shown.length}
      </Subheading>

      {shown.map((invoice) => (
        <ListItem
          key={invoice.id}
          title={
            <>
              {invoice.number}{" "}
              <Text as="span" type="tertiary">
                {invoice.customerName}
              </Text>
            </>
          }
          subtitle={
            <>
              {t("Issued")} {formatDate(invoice.issueDate)} · {t("due")}{" "}
              {formatDate(invoice.dueDate)}
              {invoice.isOverdue ? ` · ${t("overdue")}` : ""} ·{" "}
              {formatCurrency(invoice.total)}
              {invoice.due > 0 && invoice.status !== "void"
                ? ` · ${t("owing")} ${formatCurrency(invoice.due)}`
                : ""}
            </>
          }
          actions={
            <Flex align="center" gap={8}>
              <StatusChip status={invoice.status} />
              <Button
                neutral
                borderOnHover
                onClick={() => history.push(`/invoices/${invoice.id}`)}
              >
                {t("Open")}
              </Button>
            </Flex>
          }
          border
        />
      ))}

      {shown.length === 0 ? <Empty>{t("Nothing here.")}</Empty> : null}
    </AppPage>
  );
}
export default Invoices;
