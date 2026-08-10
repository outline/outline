import { useShop } from "~/stores/shop";
import { currentBranch } from "../../src/mocks/shop";
import { useTranslation } from "react-i18next";
import { AppPage } from "~/components/AppPage";
import { Insights } from "~/components/Insights";
import { StatsSimpleInCards } from "~/components/StatsSimpleInCards";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import Text from "~/components/Text";
import { StatusChip } from "~/components/StatusChip";
import { OnboardingChecklist } from "~/components/OnboardingChecklist";
import { TrendChart } from "~/components/TrendChart";
import { TopSellers } from "~/components/TopSellers";
import Subheading from "~/components/Subheading";
import { formatCurrency, formatDate } from "~/utils/format";

/**
 * Operational overview for the store: today's takings, boarding occupancy and
 * the work waiting to be dealt with.
 *
 * @returns the rendered dashboard.
 */
function Dashboard() {
  const { t } = useTranslation();
  const dashboard = useShop((state) => state.dashboard);
  const trend = useShop((state) => state.trend);
  const topSellers = useShop((state) => state.topSellers);
  const allBoardings = useShop((state) => state.boardings);
  const scope = currentBranch();
  // Narrowed to the branch being looked at, like the figures above it.
  const boardings = scope
    ? allBoardings.filter((boarding) => boarding.branch === scope)
    : allBoardings;
  const orders = useShop((state) => state.orders);

  const stats = [
    {
      name: t("Revenue today"),
      value: dashboard ? formatCurrency(dashboard.revenueToday) : "—",
      hint: dashboard ? `${dashboard.ordersToday} orders` : undefined,
    },
    {
      name: t("Occupancy"),
      value: dashboard ? `${dashboard.occupancyRate}%` : "—",
      hint: dashboard
        ? `${dashboard.occupied} of ${dashboard.capacity} spaces`
        : undefined,
    },
    {
      name: t("Guests boarding"),
      value: dashboard ? String(dashboard.activeBoardings) : "—",
      hint: dashboard ? `${dashboard.arrivalsToday} arriving today` : undefined,
    },
    {
      name: t("Needs attention"),
      value: dashboard
        ? String(dashboard.lowStock + dashboard.unpaidOrders)
        : "—",
      hint: dashboard
        ? `${dashboard.lowStock} low stock · ${dashboard.unpaidOrders} unpaid`
        : undefined,
    },
  ];

  const upcoming = boardings
    .filter((boarding) => boarding.status !== "checked_out")
    .slice(0, 5);

  return (
    <AppPage
      title={t("Dashboard")}
      description={t("Today across the store, boarding and point of sale.")}
    >
      <StatsSimpleInCards
        title=""
        stats={stats.map((stat) => ({
          name: stat.name,
          stat: stat.value,
          hint: stat.hint,
        }))}
      />

      <Flex gap={24} wrap style={{ paddingTop: 8 }}>
        <Flex column style={{ flex: "1 1 320px" }}>
          <Subheading>{t("Boarding schedule")}</Subheading>
          {upcoming.map((boarding) => (
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
                  {boarding.roomName} · {formatDate(boarding.checkIn)} –{" "}
                  {formatDate(boarding.checkOut)}
                </>
              }
              actions={<StatusChip status={boarding.status} />}
              border
            />
          ))}
          {upcoming.length === 0 ? (
            <Empty>{t("Nothing scheduled.")}</Empty>
          ) : null}
        </Flex>

        <Flex column style={{ flex: "1 1 320px" }}>
          <Subheading>{t("Recent orders")}</Subheading>
          {orders.slice(0, 5).map((order) => (
            <ListItem
              key={order.id}
              title={order.number}
              subtitle={
                <>
                  {order.customerName} · {order.channel.toUpperCase()}
                </>
              }
              actions={
                <Flex align="center" gap={8}>
                  <Text weight="bold">{formatCurrency(order.total)}</Text>
                  <StatusChip status={order.status} />
                </Flex>
              }
              border
            />
          ))}
          {orders.length === 0 ? <Empty>{t("No orders yet.")}</Empty> : null}
        </Flex>
      </Flex>

      <OnboardingChecklist />

      <Subheading>{t("Takings")}</Subheading>
      <TrendChart points={trend} />

      <Subheading>{t("Selling best")}</Subheading>
      <TopSellers sellers={topSellers} />

      <Insights limit={6} />
    </AppPage>
  );
}

export default Dashboard;
