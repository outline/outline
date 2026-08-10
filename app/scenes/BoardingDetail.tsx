import { useTranslation } from "react-i18next";
import { useHistory, useParams } from "react-router-dom";
import { AppPage } from "~/components/AppPage";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { StatusChip } from "~/components/StatusChip";
import { useShop } from "~/stores/shop";
import { formatCurrency, formatDate } from "~/utils/format";

/** Nights between two dates, minimum one. */
function nights(checkIn: string, checkOut: string): number {
  const span = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(span / 86400000));
}

/**
 * One reservation: who is in, where, for how long, and what it comes to.
 *
 * The bill is derived from the stay rather than stored, so it stays right when
 * the dates or the rate change.
 *
 * @returns the rendered boarding detail.
 */
function BoardingDetail() {
  const { t } = useTranslation();
  const history = useHistory();
  const { boardingId } = useParams<{ boardingId: string }>();
  const boardings = useShop((state) => state.boardings);
  const customers = useShop((state) => state.customers);
  const isLoading = useShop((state) => state.isLoading);
  const setBoardingStatus = useShop((state) => state.setBoardingStatus);

  const boarding = boardings.find((item) => item.id === boardingId);

  if (!boarding) {
    return (
      <AppPage title={t("Boarding")}>
        <Empty>
          {isLoading ? t("Loading…") : t("That reservation no longer exists.")}
        </Empty>
        <Flex style={{ paddingTop: 16 }}>
          <Button
            neutral
            borderOnHover
            onClick={() => history.push("/boardings")}
          >
            {t("Back to boardings")}
          </Button>
        </Flex>
      </AppPage>
    );
  }

  const stay = nights(boarding.checkIn, boarding.checkOut);
  const owner = customers.find((item) => item.id === boarding.customerId);
  const pet = owner?.pets.find((item) => item.name === boarding.petName);

  const facts = [
    { label: t("Room"), value: `${boarding.roomName}, ${boarding.branch}` },
    { label: t("Check in"), value: formatDate(boarding.checkIn) },
    { label: t("Check out"), value: formatDate(boarding.checkOut) },
    {
      label: t("Nights"),
      value: `${stay} × ${formatCurrency(boarding.ratePerNight)}`,
    },
    { label: t("Owner"), value: owner?.phone ?? boarding.customerName },
    {
      label: t("Pet"),
      value: pet ? `${pet.species} · ${pet.breed}` : boarding.petName,
    },
  ];

  return (
    <AppPage
      title={`${boarding.petName} · ${boarding.code}`}
      description={`${boarding.customerName} · ${boarding.roomName}`}
      actions={
        <Flex align="center" gap={8}>
          <StatusChip status={boarding.status} />
          {boarding.status === "booked" ? (
            <Button
              onClick={() => void setBoardingStatus(boarding.id, "checked_in")}
            >
              {t("Check in")}
            </Button>
          ) : null}
          {boarding.status === "checked_in" ? (
            <Button
              onClick={() => void setBoardingStatus(boarding.id, "checked_out")}
            >
              {t("Check out")}
            </Button>
          ) : null}
          {boarding.status === "booked" ? (
            <Button
              neutral
              borderOnHover
              onClick={() => void setBoardingStatus(boarding.id, "cancelled")}
            >
              {t("Cancel stay")}
            </Button>
          ) : null}
        </Flex>
      }
    >
      <Subheading>{t("The stay")}</Subheading>
      {facts.map((fact) => (
        <ListItem
          key={fact.label}
          title={fact.label}
          actions={<Text weight="bold">{fact.value}</Text>}
          border
        />
      ))}

      <Subheading>{t("Open bill")}</Subheading>
      <ListItem
        title={t("Boarding, {{nights}} nights", { nights: stay })}
        subtitle={`${formatCurrency(boarding.ratePerNight)} ${t("per night")}`}
        actions={
          <Text weight="bold">
            {formatCurrency(boarding.ratePerNight * stay)}
          </Text>
        }
        border
      />

      <Flex style={{ paddingTop: 16 }}>
        <Button
          neutral
          borderOnHover
          onClick={() => history.push("/boardings")}
        >
          {t("Back to boardings")}
        </Button>
      </Flex>
    </AppPage>
  );
}

export default BoardingDetail;
