import { Link, useParams } from "react-router-dom";
import { useShop } from "~/stores/shop";
import { AppPage } from "~/components/AppPage";
import { formatCurrency, formatDate, statusBadge } from "~/utils/format";

/**
 * A single invoice with its lines.
 *
 * @returns the rendered order detail.
 */
function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const orders = useShop((state) => state.orders);
  const isLoading = useShop((state) => state.isLoading);
  const markOrderPaid = useShop((state) => state.markOrderPaid);

  const order = orders.find((item) => item.id === orderId);

  if (!order) {
    return (
      <AppPage title="Invoice">
        <p className="text-sm text-gray-500">
          {isLoading ? "Loading…" : "That invoice no longer exists."}
        </p>
        <Link
          to="/orders"
          className="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-500"
        >
          Back to orders
        </Link>
      </AppPage>
    );
  }

  return (
    <AppPage
      title={order.number}
      description={`${order.customerName} · ${order.channel.toUpperCase()}`}
      actions={
        order.status !== "paid" ? (
          <button
            type="button"
            onClick={() => void markOrderPaid(order.id)}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
          >
            Mark paid
          </button>
        ) : (
          <span className={statusBadge(order.status)}>{order.status}</span>
        )
      }
    >
      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 border-b border-gray-100 p-6 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">
              Customer
            </dt>
            <dd className="mt-1 text-sm text-gray-900">{order.customerName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">
              Paid
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {order.paidAt ? formatDate(order.paidAt) : "Not yet"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">
              Status
            </dt>
            <dd className="mt-1">
              <span className={statusBadge(order.status)}>{order.status}</span>
            </dd>
          </div>
        </dl>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Item", "Qty", "Price", "Amount"].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <tr key={item.productId}>
                <td className="px-6 py-3 text-sm text-gray-900">{item.name}</td>
                <td className="px-6 py-3 text-sm text-gray-700">
                  {item.quantity}
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">
                  {formatCurrency(item.price)}
                </td>
                <td className="px-6 py-3 text-sm font-medium text-gray-900">
                  {formatCurrency(item.price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200">
              <td
                colSpan={3}
                className="px-6 py-3 text-sm font-medium text-gray-500"
              >
                Total
              </td>
              <td
                data-testid="order-total"
                className="px-6 py-3 text-base font-semibold text-gray-900"
              >
                {formatCurrency(order.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <Link
        to="/orders"
        className="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-500"
      >
        Back to orders
      </Link>
    </AppPage>
  );
}

export default OrderDetail;
