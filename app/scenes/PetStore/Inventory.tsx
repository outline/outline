import { useState } from "react";
import { usePetStore } from "~/stores/petstore";
import { PetStoreScene } from "./components/PetStoreScene";
import { formatCurrency, formatDate, statusBadge } from "./format";

const TABS = ["Batches", "Movements", "Purchase orders", "Suppliers"] as const;

/** Classes for a movement type chip. */
function movementTone(type: string): string {
  const tones: Record<string, string> = {
    in: "bg-green-50 text-green-700 ring-green-600/20",
    out: "bg-red-50 text-red-700 ring-red-600/10",
    transfer: "bg-blue-50 text-blue-700 ring-blue-700/10",
    adjustment: "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
  };
  return `inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ring-1 ring-inset ${
    tones[type] ?? "bg-gray-50 text-gray-600 ring-gray-500/10"
  }`;
}

/**
 * Inventory across warehouses: stock batches and their expiry, the movement
 * ledger, purchase orders and the suppliers behind them.
 *
 * @returns the rendered inventory page.
 */
function PetStoreInventory() {
  const batches = usePetStore((state) => state.batches);
  const movements = usePetStore((state) => state.movements);
  const purchaseOrders = usePetStore((state) => state.purchaseOrders);
  const suppliers = usePetStore((state) => state.suppliers);
  const warehouses = usePetStore((state) => state.warehouses);
  const receivePurchaseOrder = usePetStore(
    (state) => state.receivePurchaseOrder
  );

  const [tab, setTab] = useState<(typeof TABS)[number]>("Batches");

  const warehouseName = (id: string) =>
    warehouses.find((warehouse) => warehouse.id === id)?.name ?? id;

  const expired = batches.filter(
    (batch) => new Date(batch.expiresAt).getTime() < Date.now()
  ).length;
  const expiringSoon = batches.filter((batch) => {
    const days = (new Date(batch.expiresAt).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 30;
  }).length;

  return (
    <PetStoreScene
      title="Inventory"
      description="Stock by warehouse, movements, and what is on order."
      actions={
        <span className="text-sm text-gray-500">
          {expired} expired · {expiringSoon} expiring soon
        </span>
      }
    >
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Inventory sections">
          {TABS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTab(option)}
              className={`border-b-2 px-1 pb-3 text-sm font-medium ${
                tab === option
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {option}
            </button>
          ))}
        </nav>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
        {tab === "Batches" ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Lot", "Product", "Warehouse", "Qty", "Expires"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {batches.map((batch) => {
                const days =
                  (new Date(batch.expiresAt).getTime() - Date.now()) / 86400000;
                return (
                  <tr key={batch.id}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {batch.lot}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {batch.productName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {warehouseName(batch.warehouseId)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {batch.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={
                          days < 0
                            ? "font-semibold text-red-600"
                            : days <= 30
                              ? "font-medium text-yellow-700"
                              : "text-gray-700"
                        }
                      >
                        {formatDate(batch.expiresAt)}
                      </span>
                      {days < 0 ? (
                        <span className="block text-xs text-red-600">
                          expired
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}

        {tab === "Movements" ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Date",
                  "Product",
                  "Warehouse",
                  "Type",
                  "Qty",
                  "Reference",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {formatDate(movement.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {movement.productName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {warehouseName(movement.warehouseId)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={movementTone(movement.type)}>
                      {movement.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {movement.quantity > 0
                      ? `+${movement.quantity}`
                      : movement.quantity}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {movement.reference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {tab === "Purchase orders" ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Number", "Supplier", "Expected", "Value", "Status", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {purchaseOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {order.number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {order.supplierName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {formatDate(order.expectedAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {formatCurrency(
                      order.items.reduce(
                        (total, item) => total + item.cost * item.quantity,
                        0
                      )
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusBadge(order.status)}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {order.status !== "received" &&
                    order.status !== "cancelled" ? (
                      <button
                        type="button"
                        onClick={() => void receivePurchaseOrder(order.id)}
                        className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500"
                      >
                        Receive
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {tab === "Suppliers" ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Supplier", "Contact", "Phone", "Terms"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {supplier.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {supplier.contact}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {supplier.phone}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {supplier.terms}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </PetStoreScene>
  );
}

export default PetStoreInventory;
