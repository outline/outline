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
 * One customer: their pets, and everything the shop has done for them.
 *
 * The history is gathered from the records themselves rather than kept on the
 * customer, so it cannot fall out of step with what actually happened.
 *
 * @returns the rendered customer detail.
 */
function CustomerDetail() {
  const { t } = useTranslation();
  const history = useHistory();
  const { customerId } = useParams<{
    customerId: string;
  }>();
  const customers = useShop((state) => state.customers);
  const boardings = useShop((state) => state.boardings);
  const grooming = useShop((state) => state.grooming);
  const invoices = useShop((state) => state.invoices);
  const loyalty = useShop((state) => state.loyalty);
  const isLoading = useShop((state) => state.isLoading);
  const customer = customers.find((item) => item.id === customerId);
  if (!customer) {
    return (
      <AppPage title={t("Customer")}>
        <Empty>
          {isLoading ? t("Loading…") : t("That customer no longer exists.")}
        </Empty>
        <Flex style={{ paddingTop: 16 }}>
          <Button
            neutral
            borderOnHover
            onClick={() => history.push("/customers")}
          >
            {t("Back to customers")}
          </Button>
        </Flex>
      </AppPage>
    );
  }
  const theirBoardings = boardings.filter(
    (item) => item.customerId === customer.id
  );
  const theirGrooming = grooming.filter(
    (item) => item.customerId === customer.id
  );
  const theirInvoices = invoices.filter(
    (item) => item.customerId === customer.id
  );
  const theirPoints = loyalty.filter((item) => item.customerId === customer.id);
  const owed = theirInvoices
    .filter((invoice) => invoice.status !== "void")
    .reduce((sum, invoice) => sum + invoice.due, 0);
  return (
    <AppPage
      title={customer.name}
      description={`${customer.email} · ${customer.phone}`}
      actions={
        <Text type="tertiary" size="small">
          {customer.loyaltyPoints.toLocaleString("id-ID")} {t("pts")}
          {owed > 0 ? ` · ${t("owes")} ${formatCurrency(owed)}` : ""}
        </Text>
      }
    >
      <Subheading>
        {t("Pets")} · {customer.pets.length}
      </Subheading>
      {customer.pets.map((pet) => (
        <ListItem
          key={pet.id}
          title={pet.name}
          subtitle={`${pet.species} · ${pet.breed}`}
          border
        />
      ))}
      {customer.pets.length === 0 ? (
        <Empty>{t("No pets on record.")}</Empty>
      ) : null}

      <Subheading>
        {t("Stays")} · {theirBoardings.length}
      </Subheading>
      {theirBoardings.map((boarding) => {
        const stay = nights(boarding.checkIn, boarding.checkOut);
        return (
          <ListItem
            key={boarding.id}
            title={`${boarding.petName} · ${boarding.roomName}`}
            subtitle={
              <>
                {boarding.code} · {formatDate(boarding.checkIn)}–
                {formatDate(boarding.checkOut)} · {stay}{" "}
                {stay === 1 ? t("night") : t("nights")}
              </>
            }
            actions={
              <Flex align="center" gap={8}>
                <StatusChip status={boarding.status} />
                <Button
                  neutral
                  borderOnHover
                  onClick={() => history.push(`/boardings/${boarding.id}`)}
                >
                  {t("Open")}
                </Button>
              </Flex>
            }
            border
          />
        );
      })}
      {theirBoardings.length === 0 ? (
        <Empty>{t("They have not stayed with us.")}</Empty>
      ) : null}

      <Subheading>
        {t("Grooming")} · {theirGrooming.length}
      </Subheading>
      {theirGrooming.map((appointment) => (
        <ListItem
          key={appointment.id}
          title={`${appointment.service} · ${appointment.petName}`}
          subtitle={`${formatDate(appointment.scheduledAt)} · ${appointment.groomerName}`}
          actions={
            <Flex align="center" gap={8}>
              <StatusChip status={appointment.status} />
              <Text weight="bold">{formatCurrency(appointment.price)}</Text>
            </Flex>
          }
          border
        />
      ))}
      {theirGrooming.length === 0 ? (
        <Empty>{t("No grooming booked.")}</Empty>
      ) : null}

      <Subheading>
        {t("Invoices")} · {theirInvoices.length}
      </Subheading>
      {theirInvoices.map((invoice) => (
        <ListItem
          key={invoice.id}
          title={invoice.number}
          subtitle={
            <>
              {t("due")} {formatDate(invoice.dueDate)} ·{" "}
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
      {theirInvoices.length === 0 ? (
        <Empty>{t("Nothing has been invoiced.")}</Empty>
      ) : null}

      <Subheading>{t("Points")}</Subheading>
      {theirPoints.map((movement) => (
        <ListItem
          key={movement.id}
          title={movement.reason}
          subtitle={formatDate(movement.date)}
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
      {theirPoints.length === 0 ? (
        <Empty>{t("No points earned yet.")}</Empty>
      ) : null}

      <Flex style={{ paddingTop: 16 }}>
        <Button
          neutral
          borderOnHover
          onClick={() => history.push("/customers")}
        >
          {t("Back to customers")}
        </Button>
      </Flex>
    </AppPage>
  );
}
export default CustomerDetail;
