import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useParams } from "react-router-dom";
import { AppPage } from "~/components/AppPage";
import { useFields } from "~/hooks/useFields";
import { usePanel } from "~/hooks/usePanel";
import { useSubmit } from "~/hooks/useSubmit";
import Button from "~/components/Button";
import { Capitalize } from "~/components/Surface";
import { Tab, Tabs } from "~/components/Tabs";
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

const TABS = ["Profile", "Commission", "Advances", "Shifts"] as const;

const SOURCES = [
  { value: "manual", label: "Paid back" },
  { value: "commission", label: "Taken from commission" },
];

/** Minutes past midnight for a `hh:mm` clock time, or undefined if unparsable. */
function minutesOfDay(time: string): number | undefined {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) {
    return undefined;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Hours worked between two clock times on the same day.
 *
 * Shifts are stored as `hh:mm` rather than timestamps, so these are parsed by
 * hand – passing them to `new Date` yields NaN.
 *
 * @param clockIn when the shift started.
 * @param clockOut when it ended, or null while still open.
 * @returns hours to one decimal, or undefined if still open or unparsable.
 */
function hours(clockIn: string, clockOut: string | null): number | undefined {
  if (!clockOut) {
    return undefined;
  }
  const start = minutesOfDay(clockIn);
  const end = minutesOfDay(clockOut);
  if (start === undefined || end === undefined) {
    return undefined;
  }
  // A shift running past midnight ends on a smaller clock reading.
  const span = end >= start ? end - start : end + 24 * 60 - start;
  return Math.round((span / 60) * 10) / 10;
}

/**
 * One staff member: what they earn, what they owe, and when they worked.
 *
 * Advances are the reason this page exists rather than a row on the staff
 * list – money lent against future wages needs somewhere to live.
 *
 * @returns the rendered staff detail.
 */
function StaffDetail() {
  const { t } = useTranslation();
  const history = useHistory();
  const { staffId } = useParams<{ staffId: string }>();
  const staff = useShop((state) => state.staff);
  const commissions = useShop((state) => state.commissions);
  const advances = useShop((state) => state.advances);
  const shifts = useShop((state) => state.shifts);
  const isLoading = useShop((state) => state.isLoading);
  const setStaffStatus = useShop((state) => state.setStaffStatus);
  const onShift = useShop((state) => state.onShift);
  const clockIn = useShop((state) => state.clockIn);
  const clockOut = useShop((state) => state.clockOut);
  const createAdvance = useShop((state) => state.createAdvance);
  const repayAdvance = useShop((state) => state.repayAdvance);

  const tabs = usePanel<(typeof TABS)[number]>("Profile");
  const tab = tabs.current ?? "Profile";
  const submission = useSubmit();
  const fields = useFields({ amount: "", installment: "", notes: "" });
  const [repayments, setRepayments] = useState<Record<string, string>>({});
  const [sources, setSources] = useState<Record<string, string>>({});

  const member = staff.find((item) => item.id === staffId);

  if (!member) {
    return (
      <AppPage title={t("Staff")}>
        <Empty>
          {isLoading ? t("Loading…") : t("That person is no longer on staff.")}
        </Empty>
        <Flex style={{ paddingTop: 16 }}>
          <Button neutral borderOnHover onClick={() => history.push("/staff")}>
            {t("Back to staff")}
          </Button>
        </Flex>
      </AppPage>
    );
  }

  const commission = commissions.find((row) => row.id === member.id);
  const theirAdvances = advances.filter((row) => row.staffId === member.id);
  const theirShifts = shifts.filter((row) => row.staffId === member.id);
  const owed = theirAdvances.reduce((sum, row) => sum + row.remaining, 0);

  const handleLend = () =>
    submission.run(async () => {
      if (Number(fields.get("amount")) <= 0) {
        return t("An advance needs an amount.");
      }
      await createAdvance({
        staffId: member.id,
        amount: Number(fields.get("amount")),
        installment:
          Number(fields.get("installment")) ||
          Math.round(Number(fields.get("amount")) / 5),
        notes: fields.get("notes").trim(),
      });
      fields.reset();
      return t("Advance recorded.");
    });

  const working = onShift.find((entry) => entry.staffId === member.id);

  const handleClock = () =>
    submission.run(async () => {
      const result = working
        ? await clockOut(member.id)
        : await clockIn(member.id);

      if (result?.ok) {
        return working ? t("Clocked out.") : t("Clocked in.");
      }
      return result?.reason === "not_working"
        ? t("They are not working today, so they cannot start a shift.")
        : t("That could not be recorded.");
    });

  const handleRepay = (id: string) =>
    submission.run(async () => {
      const result = await repayAdvance(
        id,
        Number(repayments[id] ?? 0),
        sources[id] === "commission" ? "commission" : "manual"
      );

      if (result?.repaid) {
        setRepayments({ ...repayments, [id]: "" });
        return t("Repayment recorded.");
      }
      if (result?.reason === "overpay") {
        return t("That is more than the {{remaining}} still owed.", {
          remaining: formatCurrency(result.remaining ?? 0),
        });
      }
      return t("Enter an amount to repay.");
    });

  const profile = [
    { label: t("Role"), value: <Capitalize>{t(member.role)}</Capitalize> },
    { label: t("Branch"), value: member.branch },
    { label: t("Phone"), value: member.phone },
    // commissionRate is stored as a whole percent (5, not 0.05).
    { label: t("Commission rate"), value: `${member.commissionRate}%` },
    { label: t("Advances outstanding"), value: formatCurrency(owed) },
  ];

  return (
    <AppPage
      title={member.name}
      description={
        <>
          <Capitalize>{t(member.role)}</Capitalize> · {member.branch}
        </>
      }
      actions={
        <Flex align="center" gap={8}>
          <StatusChip status={member.status} />
          <Button
            neutral
            borderOnHover
            onClick={() =>
              void setStaffStatus(
                member.id,
                member.status === "active" ? "on_leave" : "active"
              )
            }
          >
            {member.status === "active" ? t("Set on leave") : t("Set active")}
          </Button>
        </Flex>
      }
    >
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

      {submission.notice ? (
        <Text as="p" type="secondary" data-testid="staff-notice">
          {submission.notice}
        </Text>
      ) : null}

      {tab === "Profile" ? (
        <>
          <Subheading>{t("Details")}</Subheading>
          {profile.map((row) => (
            <ListItem
              key={row.label}
              title={row.label}
              actions={<Text weight="bold">{row.value}</Text>}
              border
            />
          ))}
        </>
      ) : null}

      {tab === "Commission" ? (
        <>
          <Subheading>{t("Earned this period")}</Subheading>
          {commission ? (
            <>
              <ListItem
                title={t("Sales it is worked out on")}
                actions={
                  <Text weight="bold">{formatCurrency(commission.base)}</Text>
                }
                border
              />
              <ListItem
                title={`${t("Rate")} ${commission.rate}%`}
                actions={
                  <Text weight="bold">{formatCurrency(commission.amount)}</Text>
                }
                border
              />
            </>
          ) : (
            <Empty>{t("No commission on the books for them yet.")}</Empty>
          )}
        </>
      ) : null}

      {tab === "Advances" ? (
        <>
          <Subheading>
            {t("Advances")} · {formatCurrency(owed)} {t("outstanding")}
          </Subheading>
          {theirAdvances.map((advance) => (
            <div key={advance.id}>
              <ListItem
                title={formatCurrency(advance.amount)}
                subtitle={
                  <>
                    {formatDate(advance.createdAt)} · {t("instalments of")}{" "}
                    {formatCurrency(advance.installment)} · {t("repaid")}{" "}
                    {formatCurrency(advance.repaid)}
                    {advance.notes ? ` · ${advance.notes}` : ""}
                  </>
                }
                actions={
                  <Flex align="center" gap={8}>
                    <StatusChip status={advance.status} />
                    <Text weight="bold">
                      {formatCurrency(advance.remaining)}
                    </Text>
                  </Flex>
                }
                border
              />
              {advance.remaining > 0 ? (
                <Flex gap={8} wrap align="flex-end">
                  <Input
                    label={t("Repay")}
                    value={repayments[advance.id] ?? ""}
                    onChange={(event) =>
                      setRepayments({
                        ...repayments,
                        [advance.id]: event.target.value,
                      })
                    }
                    short
                  />
                  <InputSelect
                    label={t("How")}
                    value={sources[advance.id] ?? "manual"}
                    onChange={(value) =>
                      setSources({ ...sources, [advance.id]: value })
                    }
                    options={SOURCES.map((option) => ({
                      type: "item",
                      label: t(option.label),
                      value: option.value,
                    }))}
                  />
                  <Button onClick={() => void handleRepay(advance.id)}>
                    {t("Record")}
                  </Button>
                </Flex>
              ) : null}
            </div>
          ))}
          {theirAdvances.length === 0 ? (
            <Empty>{t("They have not taken an advance.")}</Empty>
          ) : null}

          <Subheading>{t("Lend against wages")}</Subheading>
          <Flex gap={8} wrap align="flex-end">
            <Input
              label={t("Amount")}
              value={fields.get("amount")}
              onChange={(event) => fields.set("amount", event.target.value)}
              short
            />
            <Input
              label={t("Instalment")}
              value={fields.get("installment")}
              onChange={(event) =>
                fields.set("installment", event.target.value)
              }
              short
            />
            <Input
              label={t("Notes")}
              value={fields.get("notes")}
              onChange={(event) => fields.set("notes", event.target.value)}
            />
            <Button onClick={handleLend}>{t("Record advance")}</Button>
          </Flex>
        </>
      ) : null}

      {tab === "Shifts" ? (
        <>
          <Subheading>{t("On shift now")}</Subheading>
          <ListItem
            title={
              working
                ? t("Clocked in since {{time}}", { time: working.since })
                : t("Not clocked in")
            }
            subtitle={
              member.status === "active"
                ? undefined
                : t("Only someone working can start a shift.")
            }
            actions={
              <Button
                neutral={!!working}
                borderOnHover
                disabled={!working && member.status !== "active"}
                onClick={() => void handleClock()}
              >
                {working ? t("Clock out") : t("Clock in")}
              </Button>
            }
            border
          />

          <Subheading>
            {t("Shifts")} · {theirShifts.length}
          </Subheading>
          {theirShifts.map((shift) => {
            const worked = hours(shift.clockIn, shift.clockOut);
            return (
              <ListItem
                key={shift.id}
                title={formatDate(shift.date)}
                subtitle={
                  worked === undefined
                    ? t("Still clocked in")
                    : `${worked} ${t("hours")}`
                }
                actions={
                  <StatusChip
                    status={shift.clockOut ? "checked_out" : "active"}
                  />
                }
                border
              />
            );
          })}
          {theirShifts.length === 0 ? (
            <Empty>{t("No shifts recorded.")}</Empty>
          ) : null}
        </>
      ) : null}

      <Flex style={{ paddingTop: 16 }}>
        <Button neutral borderOnHover onClick={() => history.push("/staff")}>
          {t("Back to staff")}
        </Button>
      </Flex>
    </AppPage>
  );
}

export default StaffDetail;
