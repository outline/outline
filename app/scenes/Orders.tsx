import { useState } from "react";
import { Link } from "react-router-dom";
import { useShop } from "~/stores/shop";
import { AppPage } from "~/components/AppPage";
import { formatCurrency, formatDate, statusBadge } from "~/utils/format";

const FILTERS = ["All", "Paid", "Unpaid"] as const;

/**
 * Sales history. Anything still in draft is an unpaid invoice and can be
 * settled from here.
 *
 * @returns the rendered orders list.
 */
function Orders() {
  const orders = useShop((state) => state.orders);
  const markOrderPaid = useShop((state) => state.markOrderPaid);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const visible = orders.filter((order) => {
    if (filter === "Paid") {
      return order.status === "paid";
    }
    if (filter === "Unpaid") {
      return order.status !== "paid";
    }
    return true;
  });

  const outstanding = orders
    .filter((order) => order.status !== "paid")
    .reduce((total, order) => total + order.total, 0);

  return (
    <AppPage
      title="Orders"
      description="Every sale, from the till and online."
      actions={
        <span className="text-sm text-gray-500">
          Outstanding {formatCurrency(outstanding)}
        </span>
      }
    >
      <div className="mb-4 flex gap-2">
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              filter === option
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                "Invoice",
                "Customer",
                "Channel",
                "Date",
                "Total",
                "Status",
                "",
              ].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {visible.map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-3 text-sm font-medium">
                  <Link
                    to={`/orders/${order.id}`}
                    className="text-indigo-600 hover:text-indigo-500"
                  >
                    {order.number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {order.customerName}
                </td>
                <td className="px-4 py-3 text-sm uppercase text-gray-500">
                  {order.channel}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {order.paidAt ? formatDate(order.paidAt) : "—"}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {formatCurrency(order.total)}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={statusBadge(order.status)}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {order.status !== "paid" ? (
                    <button
                      type="button"
                      onClick={() => void markOrderPaid(order.id)}
                      className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500"
                    >
                      Mark paid
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">No orders here.</p>
        ) : null}
      </div>
    </AppPage>
  );
}

export default Orders;
