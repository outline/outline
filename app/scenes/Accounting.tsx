import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppPage } from "~/components/AppPage";
import { Capitalize } from "~/components/Surface";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import { InputSelect } from "~/components/InputSelect";
import ListItem from "~/components/List/Item";
import Subheading from "~/components/Subheading";
import { Tab, Tabs } from "~/components/Tabs";
import Text from "~/components/Text";
import { useShop } from "~/stores/shop";
import { formatCurrency, formatDate } from "~/utils/format";

const TABS = [
  "Journal",
  "Expenses",
  "Petty cash",
  "Commissions",
  "Attendance",
  "Reports",
] as const;

const CATEGORIES = ["Rent", "Wages", "Supplies", "Utilities"];

/**
 * The books.
 *
 * Everything here derives from one double-entry journal: recording an expense
 * posts a balanced entry, and the trial balance and profit figures are summed
 * back out of those entries rather than being stored separately.
 *
 * @returns the rendered accounting page.
 */
function Accounting() {
  const { t } = useTranslation();
  const accounts = useShop((state) => state.accounts);
  const journal = useShop((state) => state.journal);
  const expenses = useShop((state) => state.expenses);
  const shifts = useShop((state) => state.shifts);
  const trialBalance = useShop((state) => state.trialBalance);
  const cashFlow = useShop((state) => state.cashFlow);
  const commissions = useShop((state) => state.commissions);
  const createExpense = useShop((state) => state.createExpense);

  const [tab, setTab] = useState<(typeof TABS)[number]>("Journal");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidFrom, setPaidFrom] = useState("acc-cash");

  const accountName = (id: string) =>
    accounts.find((account) => account.id === id)?.name ?? id;

  const income = trialBalance
    .filter((row) => row.type === "income")
    .reduce((total, row) => total + row.balance, 0);
  const expenseTotal = trialBalance
    .filter((row) => row.type === "expense")
    .reduce((total, row) => total + row.balance, 0);
  const debits = trialBalance.reduce((total, row) => total + row.debit, 0);
  const credits = trialBalance.reduce((total, row) => total + row.credit, 0);

  const pettyCash = journal
    .flatMap((entry) =>
      entry.lines
        .filter((line) => line.accountId === "acc-petty")
        .map((line) => ({ entry, line }))
    )
    .reverse();
  const pettyBalance =
    trialBalance.find((row) => row.id === "acc-petty")?.balance ?? 0;

  const handleRecord = async () => {
    const value = Number(amount);
    if (!value || !description.trim()) {
      return;
    }
    await createExpense({
      category,
      description: description.trim(),
      amount: value,
      paidFrom,
    });
    setDescription("");
    setAmount("");
  };

  return (
    <AppPage
      title={t("Accounting")}
      description={t("The books, from one double-entry journal.")}
      actions={
        <Text type="tertiary" size="small">
          {debits === credits
            ? t("Journal balances")
            : t("Journal out by {{amount}}", {
                amount: formatCurrency(Math.abs(debits - credits)),
              })}
        </Text>
      }
    >
      <Tabs>
        {TABS.map((option) => (
          <Tab
            key={option}
            active={tab === option}
            onClick={() => setTab(option)}
          >
            {t(option)}
          </Tab>
        ))}
      </Tabs>

      {tab === "Journal" ? (
        <Flex column>
          {journal.map((entry) => (
            <ListItem
              key={entry.id}
              title={entry.memo}
              subtitle={
                <>
                  {entry.reference} · {formatDate(entry.date)} ·{" "}
                  {entry.lines
                    .map(
                      (line) =>
                        `${accountName(line.accountId)} ${
                          line.debit
                            ? `Dr ${formatCurrency(line.debit)}`
                            : `Cr ${formatCurrency(line.credit)}`
                        }`
                    )
                    .join(" · ")}
                </>
              }
              actions={
                <Text type="tertiary" size="small">
                  {formatCurrency(
                    entry.lines.reduce((total, line) => total + line.debit, 0)
                  )}
                </Text>
              }
              border
            />
          ))}
          {journal.length === 0 ? <Empty>{t("No entries.")}</Empty> : null}
        </Flex>
      ) : null}

      {tab === "Expenses" ? (
        <Flex column>
          <Flex align="flex-end" gap={8} style={{ padding: "8px 0 16px" }}>
            <InputSelect
              label={t("Category")}
              value={category}
              onChange={setCategory}
              options={CATEGORIES.map((option) => ({
                type: "item",
                label: t(option),
                value: option,
              }))}
            />
            <Input
              label={t("Description")}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              short
            />
            <Input
              label={t("Amount")}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              short
            />
            <InputSelect
              label={t("Paid from")}
              value={paidFrom}
              onChange={setPaidFrom}
              options={accounts
                .filter((account) => account.type === "asset")
                .map((account) => ({
                  type: "item",
                  label: account.name,
                  value: account.id,
                }))}
            />
            <Button onClick={() => void handleRecord()}>{t("Record")}</Button>
          </Flex>

          {expenses.map((expense) => (
            <ListItem
              key={expense.id}
              title={expense.description}
              subtitle={
                <>
                  {expense.category} · {formatDate(expense.date)} ·{" "}
                  {t("paid from")} {accountName(expense.paidFrom)}
                </>
              }
              actions={
                <Text weight="bold">{formatCurrency(expense.amount)}</Text>
              }
              border
            />
          ))}
          {expenses.length === 0 ? <Empty>{t("No expenses.")}</Empty> : null}
        </Flex>
      ) : null}

      {tab === "Petty cash" ? (
        <Flex column>
          <Subheading>
            {t("Balance")} · {formatCurrency(pettyBalance)}
          </Subheading>
          {pettyCash.map(({ entry, line }) => (
            <ListItem
              key={`${entry.id}-${line.accountId}`}
              title={entry.memo}
              subtitle={`${entry.reference} · ${formatDate(entry.date)}`}
              actions={
                <Text weight="bold">
                  {line.debit
                    ? `+${formatCurrency(line.debit)}`
                    : `−${formatCurrency(line.credit)}`}
                </Text>
              }
              border
            />
          ))}
          {pettyCash.length === 0 ? (
            <Empty>{t("Nothing through petty cash yet.")}</Empty>
          ) : null}
        </Flex>
      ) : null}

      {tab === "Commissions" ? (
        <Flex column>
          {commissions.map((row) => (
            <ListItem
              key={row.id}
              title={row.name}
              subtitle={
                <>
                  <Capitalize>{row.role}</Capitalize> · {row.branch} ·{" "}
                  {row.rate}% {t("of")} {formatCurrency(row.base)}{" "}
                  {t("they sold")}
                </>
              }
              actions={<Text weight="bold">{formatCurrency(row.amount)}</Text>}
              border
            />
          ))}
          {commissions.length === 0 ? (
            <Empty>{t("Nobody is on commission.")}</Empty>
          ) : null}
        </Flex>
      ) : null}

      {tab === "Attendance" ? (
        <Flex column>
          {shifts.map((shift) => (
            <ListItem
              key={shift.id}
              title={shift.staffName}
              subtitle={
                <>
                  {formatDate(shift.date)} · {t("in")} {shift.clockIn}
                  {shift.clockOut ? ` · ${t("out")} ${shift.clockOut}` : null}
                </>
              }
              actions={
                <Text type="tertiary" size="small">
                  {shift.clockOut ? t("Complete") : t("On shift")}
                </Text>
              }
              border
            />
          ))}
          {shifts.length === 0 ? <Empty>{t("No shifts.")}</Empty> : null}
        </Flex>
      ) : null}

      {tab === "Reports" ? (
        <Flex column>
          <Subheading>{t("Profit and loss")}</Subheading>
          <ListItem
            title={t("Income")}
            actions={<Text weight="bold">{formatCurrency(income)}</Text>}
            border
          />
          <ListItem
            title={t("Expenses")}
            actions={<Text weight="bold">{formatCurrency(expenseTotal)}</Text>}
            border
          />
          <ListItem
            title={t("Net")}
            actions={
              <Text weight="bold" data-testid="net-profit">
                {formatCurrency(income - expenseTotal)}
              </Text>
            }
            border
          />

          <Subheading>{t("Cash flow")}</Subheading>
          {cashFlow.map((row) => (
            <ListItem
              key={row.accountId}
              title={row.name}
              subtitle={
                <>
                  {t("in")} {formatCurrency(row.received)} · {t("out")}{" "}
                  {formatCurrency(row.paid)}
                </>
              }
              actions={<Text weight="bold">{formatCurrency(row.closing)}</Text>}
              border
            />
          ))}
          <ListItem
            title={t("Money on hand")}
            actions={
              <Text weight="bold">
                {formatCurrency(
                  cashFlow.reduce((sum, row) => sum + row.closing, 0)
                )}
              </Text>
            }
            border
          />

          <Subheading>{t("Trial balance")}</Subheading>
          {trialBalance
            .filter((row) => row.debit || row.credit)
            .map((row) => (
              <ListItem
                key={row.id}
                title={`${row.code} · ${row.name}`}
                subtitle={
                  <>
                    <Capitalize>{row.type}</Capitalize> · Dr{" "}
                    {formatCurrency(row.debit)} · Cr{" "}
                    {formatCurrency(row.credit)}
                  </>
                }
                actions={
                  <Text weight="bold">{formatCurrency(row.balance)}</Text>
                }
                border
              />
            ))}
        </Flex>
      ) : null}
    </AppPage>
  );
}

export default Accounting;
