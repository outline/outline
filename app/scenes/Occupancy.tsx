import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { StatusChip } from "~/components/StatusChip";
import {
  Capitalize,
  Card,
  CardGrid,
  Meter,
  MeterFill,
  PlainList,
} from "~/components/Surface";
import { CalendarsMonthView } from "~/components/CalendarsMonthView";
import { StatsSimpleInCards } from "~/components/StatsSimpleInCards";
import { boardingsToCalendar } from "~/components/scheduleDays";
import { useShop } from "~/stores/shop";
import { currentBranch } from "../../src/mocks/shop";
import { AppPage } from "~/components/AppPage";
import { formatDate } from "~/utils/format";
const Gauge = styled.div`
  margin-top: 12px;
`;
const BranchSection = styled.section`
  margin-top: 32px;
`;
const RoomCard = styled(Card)<{
  $isFull: boolean;
}>`
  padding: 16px;
  border-color: ${({ $isFull, theme }) =>
    $isFull ? theme.danger : theme.divider};
`;
/**
 * Room-by-room occupancy for today, derived from the boardings that overlap
 * the current date.
 *
 * @returns the rendered occupancy board.
 */
function Occupancy() {
  const { t } = useTranslation();
  const history = useHistory();
  const allRooms = useShop((state) => state.rooms);
  const scope = currentBranch();
  const rooms = scope
    ? allRooms.filter((room) => room.branch === scope)
    : allRooms;
  const calendar = useShop((state) => state.calendar);
  const capacity = rooms.reduce((total, room) => total + room.capacity, 0);
  const occupied = rooms.reduce((total, room) => total + room.occupied, 0);
  const roomsInUse = rooms.filter((room) => room.occupied > 0).length;
  const rate = capacity ? Math.round((occupied / capacity) * 100) : 0;
  const branches = [...new Set(rooms.map((room) => room.branch))];
  const summary = [
    {
      name: t("Occupancy"),
      value: `${rate}%`,
      hint: `${occupied} of ${capacity} spaces`,
    },
    {
      name: t("Rooms in use"),
      value: `${roomsInUse}`,
      hint: `of ${rooms.length} rooms`,
    },
    {
      name: t("Free spaces"),
      value: `${Math.max(0, capacity - occupied)}`,
      hint: "available today",
    },
  ];
  return (
    <AppPage
      title={t("Occupancy")}
      description={t("Which rooms are in use today, and who is in them.")}
    >
      <Subheading>{t("The fortnight ahead")}</Subheading>
      <CalendarsMonthView
        days={boardingsToCalendar(calendar)}
        title={new Date().toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        })}
        onSelectEvent={(event) => history.push(event.href)}
        addLabel={t("New boarding")}
        onAdd={() => history.push("/boardings/new")}
      />

      <StatsSimpleInCards
        title=""
        stats={summary.map((stat) => ({
          name: stat.name,
          stat: stat.value,
          hint: stat.hint,
        }))}
      />

      {branches.map((branch) => (
        <BranchSection key={branch}>
          <Subheading>{branch}</Subheading>
          <CardGrid role="list">
            {rooms
              .filter((room) => room.branch === branch)
              .map((room) => (
                <RoomCard as="li" key={room.id} $isFull={room.isFull}>
                  <Flex align="flex-start" justify="space-between" gap={8}>
                    <Flex column>
                      <Text size="small" weight="bold">
                        {room.name}
                      </Text>
                      <Text size="xsmall" type="tertiary">
                        <Capitalize>{room.type}</Capitalize>
                      </Text>
                    </Flex>
                    <StatusChip
                      status={
                        room.isFull
                          ? "full"
                          : room.occupied > 0
                            ? "partial"
                            : "free"
                      }
                    />
                  </Flex>

                  <Gauge>
                    <Flex align="center" justify="space-between">
                      <Text size="xsmall" type="tertiary">
                        {room.occupied} / {room.capacity}
                      </Text>
                      <Text size="xsmall" type="tertiary">
                        {Math.round((room.occupied / room.capacity) * 100)}%
                      </Text>
                    </Flex>
                    <Meter style={{ marginTop: 4 }}>
                      <MeterFill
                        $tone={room.isFull ? "full" : "some"}
                        style={{
                          width: `${Math.min(100, (room.occupied / room.capacity) * 100)}%`,
                        }}
                      />
                    </Meter>
                  </Gauge>

                  <PlainList>
                    {room.guests.map((guest) => (
                      <li key={guest.id}>
                        <Text size="xsmall" weight="bold">
                          {guest.petName}
                        </Text>{" "}
                        <Text size="xsmall" type="secondary">
                          · {guest.customerName} · out{" "}
                          {formatDate(guest.checkOut)}
                        </Text>
                      </li>
                    ))}
                    {room.guests.length === 0 ? (
                      <li>
                        <Text size="xsmall" type="tertiary">
                          Empty
                        </Text>
                      </li>
                    ) : null}
                  </PlainList>
                </RoomCard>
              ))}
          </CardGrid>
        </BranchSection>
      ))}

      {rooms.length === 0 ? <Empty>{t("No rooms configured.")}</Empty> : null}
    </AppPage>
  );
}
export default Occupancy;
