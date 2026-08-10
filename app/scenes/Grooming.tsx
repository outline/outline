import { useTranslation } from "react-i18next";
import { AppPage } from "~/components/AppPage";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import { StatusChip } from "~/components/StatusChip";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { CalendarsMonthView } from "~/components/CalendarsMonthView";
import { groomingToCalendar } from "~/components/scheduleDays";
import { useShop } from "~/stores/shop";
import { currentBranch } from "../../src/mocks/shop";
import { formatCurrency, formatDate } from "~/utils/format";

/**
 * The grooming table, grouped by where each appointment has got to.
 *
 * Finishing a groom takes payment and earns the customer points, so the sale
 * lands in orders and the dashboard the same way a till sale does.
 *
 * @returns the rendered grooming page.
 */
function Grooming() {
  const { t } = useTranslation();
  const allGrooming = useShop((state) => state.grooming);
  const scope = currentBranch();
  const grooming = scope
    ? allGrooming.filter((item) => item.branch === scope)
    : allGrooming;
  const setGroomingStatus = useShop((state) => state.setGroomingStatus);
  const diary = useShop((state) => state.groomingCalendar);

  const groups = [
    { key: "booked", title: t("Booked") },
    { key: "in_progress", title: t("On the table") },
    { key: "done", title: t("Finished") },
  ] as const;

  // Today's takings, not every groom ever finished: the label says today, and
  // the Finished group below carries the full set.
  const today = new Date().toDateString();
  const takings = grooming
    .filter(
      (item) =>
        item.status === "done" &&
        new Date(item.scheduledAt).toDateString() === today
    )
    .reduce((total, item) => total + item.price, 0);

  return (
    <AppPage
      title={t("Grooming")}
      description={t("Appointments, who is grooming, and what is owed.")}
      actions={
        <Text type="tertiary" size="small">
          {t("Finished today")} {formatCurrency(takings)}
        </Text>
      }
    >
      <Subheading>{t("The fortnight ahead")}</Subheading>
      <CalendarsMonthView
        days={groomingToCalendar(diary)}
        title={new Date().toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        })}
      />

      {groups.map((group) => {
        const inGroup = grooming.filter((item) => item.status === group.key);

        if (inGroup.length === 0) {
          return null;
        }

        return (
          <Flex column key={group.key}>
            <Subheading>
              {group.title} · {inGroup.length}
            </Subheading>
            {inGroup.map((item) => (
              <ListItem
                key={item.id}
                title={
                  <>
                    {item.petName}{" "}
                    <Text as="span" type="tertiary">
                      {item.customerName}
                    </Text>
                  </>
                }
                subtitle={
                  <>
                    {item.service} · {item.groomerName} · {item.branch} ·{" "}
                    {formatDate(item.scheduledAt)} ·{" "}
                    {formatCurrency(item.price)}
                  </>
                }
                actions={
                  <Flex align="center" gap={8}>
                    <StatusChip status={item.status} />
                    {item.status === "booked" ? (
                      <Button
                        onClick={() =>
                          void setGroomingStatus(item.id, "in_progress")
                        }
                      >
                        {t("Start")}
                      </Button>
                    ) : null}
                    {item.status === "in_progress" ? (
                      <Button
                        onClick={() => void setGroomingStatus(item.id, "done")}
                      >
                        {t("Finish and charge")}
                      </Button>
                    ) : null}
                  </Flex>
                }
                border
              />
            ))}
          </Flex>
        );
      })}

      {grooming.length === 0 ? <Empty>{t("No appointments.")}</Empty> : null}
    </AppPage>
  );
}

export default Grooming;
