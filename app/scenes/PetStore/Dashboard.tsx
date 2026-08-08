import { usePetStore } from "~/stores/petstore";
import { PetStoreScene } from "./components/PetStoreScene";
import { formatCurrency, formatDate, statusBadge } from "./format";

/**
 * Operational overview for the store: today's takings, boarding occupancy and
 * the work waiting to be dealt with.
 *
 * @returns the rendered dashboard.
 */
function PetStoreDashboard() {
  const dashboard = usePetStore((state) => state.dashboard);
  const boardings = usePetStore((state) => state.boardings);
  const orders = usePetStore((state) => state.orders);

  const stats = [
    {
      name: "Revenue today",
      value: dashboard ? formatCurrency(dashboard.revenueToday) : "—",
      hint: dashboard ? `${dashboard.ordersToday} orders` : undefined,
    },
    {
      name: "Occupancy",
      value: dashboard ? `${dashboard.occupancyRate}%` : "—",
      hint: dashboard
        ? `${dashboard.occupied} of ${dashboard.capacity} spaces`
        : undefined,
    },
    {
      name: "Guests boarding",
      value: dashboard ? String(dashboard.activeBoardings) : "—",
      hint: dashboard ? `${dashboard.arrivalsToday} arriving today` : undefined,
    },
    {
      name: "Needs attention",
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
    <PetStoreScene
      title="Dashboard"
      description="Today across the store, boarding and point of sale."
    >
      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow-sm ring-1 ring-gray-200 sm:p-6"
          >
            <dt className="truncate text-sm font-medium text-gray-500">
              {stat.name}
            </dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {stat.value}
            </dd>
            {stat.hint ? (
              <p className="mt-1 text-sm text-gray-500">{stat.hint}</p>
            ) : null}
          </div>
        ))}
      </dl>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-base font-semibold text-gray-900">
            Boarding schedule
          </h2>
          <ul
            role="list"
            className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200"
          >
            {upcoming.map((boarding) => (
              <li
                key={boarding.id}
                className="flex items-center justify-between gap-x-6 px-4 py-4 sm:px-6"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {boarding.petName}{" "}
                    <span className="font-normal text-gray-500">
                      · {boarding.customerName}
                    </span>
                  </p>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {boarding.roomName} · {formatDate(boarding.checkIn)} –{" "}
                    {formatDate(boarding.checkOut)}
                  </p>
                </div>
                <span className={statusBadge(boarding.status)}>
                  {boarding.status.replace("_", " ")}
                </span>
              </li>
            ))}
            {upcoming.length === 0 ? (
              <li className="px-4 py-6 text-sm text-gray-500 sm:px-6">
                Nothing scheduled.
              </li>
            ) : null}
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">
            Recent orders
          </h2>
          <ul
            role="list"
            className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200"
          >
            {orders.slice(0, 5).map((order) => (
              <li
                key={order.id}
                className="flex items-center justify-between gap-x-6 px-4 py-4 sm:px-6"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {order.number}
                  </p>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {order.customerName} · {order.channel.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(order.total)}
                  </p>
                  <span className={statusBadge(order.status)}>
                    {order.status}
                  </span>
                </div>
              </li>
            ))}
            {orders.length === 0 ? (
              <li className="px-4 py-6 text-sm text-gray-500 sm:px-6">
                No orders yet.
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </PetStoreScene>
  );
}

export default PetStoreDashboard;
