import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { useShop } from "~/stores/shop";
import { currentBranch } from "../../src/mocks/shop";
import { AppPage } from "~/components/AppPage";
import { StatusChip } from "~/components/StatusChip";
import { formatCurrency, formatDate } from "~/utils/format";

/** Nights between two dates, minimum one. */
function nights(checkIn: string, checkOut: string): number {
  const span = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(span / 86400000));
}

/**
 * Boarding reservations grouped by where they are in the stay, which is how
 * the front desk actually works through them: who is arriving, who is in, and
 * who has gone home.
 *
 * @returns the rendered boardings page.
 */
function Boardings() {
  const { t } = useTranslation();
  const history = useHistory();
  const allBoardings = useShop((state) => state.boardings);
  const scope = currentBranch();
  // Narrowed to the branch being looked at, when one is chosen.
  const boardings = scope
    ? allBoardings.filter((boarding) => boarding.branch === scope)
    : allBoardings;
  const setBoardingStatus = useShop((state) => state.setBoardingStatus);

  const groups = [
    { key: "booked", title: t("Arriving") },
    { key: "checked_in", title: t("Staying") },
    { key: "checked_out", title: t("Departed") },
  ] as const;

  return (
    <AppPage
      title={t("Boardings")}
      description={t(
        "Reservations across every branch, and who is in which room."
      )}
      actions={
        <Button onClick={() => history.push("/boardings/new")}>
          {t("New boarding")}
        </Button>
      }
    >
      {groups.map((group) => {
        const inGroup = boardings.filter(
          (boarding) => boarding.status === group.key
        );

        if (inGroup.length === 0) {
          return null;
        }

        return (
          <Flex column key={group.key}>
            <Subheading>
              {group.title} · {inGroup.length}
            </Subheading>
            {inGroup.map((boarding) => {
              const stay = nights(boarding.checkIn, boarding.checkOut);

              return (
                <ListItem
                  key={boarding.id}
                  title={
                    <>
                      {boarding.petName}{" "}
                      <Text as="span" type="tertiary">
                        {boarding.customerName}
                      </Text>
                    </>
                  }
                  subtitle={
                    <>
                      {boarding.code} · {boarding.roomName}, {boarding.branch} ·{" "}
                      {formatDate(boarding.checkIn)}–
                      {formatDate(boarding.checkOut)} · {stay}{" "}
                      {stay === 1 ? t("night") : t("nights")} ·{" "}
                      {formatCurrency(boarding.ratePerNight * stay)}
                    </>
                  }
                  actions={
                    // Everything here is a button rather than a link:
                    // ListItem's wrapper is an anchor, so a link in any of its
                    // slots would nest anchors.
                    <Flex align="center" gap={8}>
                      <StatusChip status={boarding.status} />
                      <Button
                        neutral
                        borderOnHover
                        onClick={() =>
                          history.push(`/boardings/${boarding.id}`)
                        }
                      >
                        {t("Open")}
                      </Button>
                      {boarding.status === "booked" ? (
                        <Button
                          onClick={() =>
                            void setBoardingStatus(boarding.id, "checked_in")
                          }
                        >
                          {t("Check in")}
                        </Button>
                      ) : null}
                      {boarding.status === "checked_in" ? (
                        <Button
                          neutral
                          borderOnHover
                          onClick={() =>
                            void setBoardingStatus(boarding.id, "checked_out")
                          }
                        >
                          {t("Check out")}
                        </Button>
                      ) : null}
                    </Flex>
                  }
                  border
                />
              );
            })}
          </Flex>
        );
      })}

      {boardings.length === 0 ? <Empty>{t("No reservations.")}</Empty> : null}
    </AppPage>
  );
}

export default Boardings;
