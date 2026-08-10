import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { AppPage } from "~/components/AppPage";
import { useSubmit } from "~/hooks/useSubmit";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import { InputSelect } from "~/components/InputSelect";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { useShop } from "~/stores/shop";

/** A date input wants `yyyy-mm-dd`, not an ISO timestamp. */
const asDateValue = (date: Date) => date.toISOString().slice(0, 10);

/** Nights between two dates, minimum one. */
function nights(checkIn: string, checkOut: string): number {
  const span = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(span / 86400000));
}

/**
 * Front-desk intake for a stay.
 *
 * The room is chosen here, but whether it is actually free for those nights is
 * the mock's call – the same rule the public booking form goes through – so
 * there is only one place that decides availability.
 *
 * @returns the rendered intake form.
 */
function BoardingNew() {
  const { t } = useTranslation();
  const history = useHistory();
  const rooms = useShop((state) => state.rooms);
  const customers = useShop((state) => state.customers);
  const createBoarding = useShop((state) => state.createBoarding);

  const [customerName, setCustomerName] = useState("");
  const [petName, setPetName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [checkIn, setCheckIn] = useState(
    asDateValue(new Date(Date.now() + 86400000))
  );
  const [checkOut, setCheckOut] = useState(
    asDateValue(new Date(Date.now() + 3 * 86400000))
  );
  const submission = useSubmit();

  const room = rooms.find((item) => item.id === roomId);
  const stay = nights(checkIn, checkOut);

  const handleSubmit = () =>
    void submission.run(async () => {
      const result = await createBoarding({
        customerName: customerName.trim(),
        petName: petName.trim(),
        roomId,
        checkIn,
        checkOut,
      });

      if (result?.created && result.boarding) {
        history.push(`/boardings/${result.boarding.id}`);
        return;
      }
      if (result?.reason === "no_room") {
        return t("That room is taken for those nights.");
      }
      if (result?.reason === "bad_dates") {
        return t("Check-out has to be after check-in.");
      }
      return t("Give us the owner, the pet, and a room.");
    });

  return (
    <AppPage
      title={t("New boarding")}
      description={t("Book a room for a stay and open the reservation.")}
    >
      {submission.notice ? (
        <Text as="p" type="secondary" data-testid="boarding-new-notice">
          {submission.notice}
        </Text>
      ) : null}

      <Subheading>{t("Who is staying")}</Subheading>
      <Flex gap={8} wrap>
        <Input
          label={t("Owner")}
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          list="boarding-customers"
        />
        <datalist id="boarding-customers">
          {customers.map((customer) => (
            <option key={customer.id} value={customer.name} />
          ))}
        </datalist>
        <Input
          label={t("Pet")}
          value={petName}
          onChange={(event) => setPetName(event.target.value)}
        />
      </Flex>

      <Subheading>{t("Room and dates")}</Subheading>
      <Flex gap={8} wrap align="flex-end">
        <InputSelect
          label={t("Room")}
          value={roomId}
          onChange={setRoomId}
          options={rooms.map((item) => ({
            type: "item",
            label: `${item.name} · ${t(item.type)} · ${item.branch}`,
            value: item.id,
          }))}
        />
        <Input
          type="date"
          label={t("Check in")}
          value={checkIn}
          onChange={(event) => setCheckIn(event.target.value)}
          short
        />
        <Input
          type="date"
          label={t("Check out")}
          value={checkOut}
          onChange={(event) => setCheckOut(event.target.value)}
          short
        />
      </Flex>

      {room ? (
        <Text as="p" type="tertiary" size="small">
          {stay} {stay === 1 ? t("night") : t("nights")} ·{" "}
          {room.occupied >= room.capacity
            ? t("Full today")
            : t("{{free}} of {{capacity}} spaces free today", {
                free: room.capacity - room.occupied,
                capacity: room.capacity,
              })}
        </Text>
      ) : null}

      <Flex gap={8} style={{ paddingTop: 16 }}>
        <Button onClick={handleSubmit} disabled={submission.isBusy}>
          {submission.isBusy ? t("Booking…") : t("Book the stay")}
        </Button>
        <Button
          neutral
          borderOnHover
          onClick={() => history.push("/boardings")}
        >
          {t("Cancel")}
        </Button>
      </Flex>
    </AppPage>
  );
}

export default BoardingNew;
