import { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import { StatusChip } from "~/components/StatusChip";
import { Tab, Tabs } from "~/components/Tabs";
import Text from "~/components/Text";
import { AppPage } from "~/components/AppPage";
import { useShop } from "~/stores/shop";
import { formatCurrency, formatDate } from "~/utils/format";

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
 * Inventory across warehouses.
 *
 * Batches and movements stay tabular because they are ledgers – a lot number
 * against a quantity and a date. Purchase orders and suppliers are records
 * about a thing rather than rows of figures, so they read as list items.
 *
 * @returns the rendered inventory page.
 */
function Inventory() {
  const { t } = useTranslation();
  const batches = useShop((state) => state.batches);
  const movements = useShop((state) => state.movements);
  const purchaseOrders = useShop((state) => state.purchaseOrders);
  const suppliers = useShop((state) => state.suppliers);
  const warehouses = useShop((state) => state.warehouses);
  const receivePurchaseOrder = useShop((state) => state.receivePurchaseOrder);

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
    <AppPage
      title={t("Inventory")}
      description={t("Stock by warehouse, movements, and what is on order.")}
      actions={
        <Text type="tertiary" size="small">
          {expired} {t("expired")} · {expiringSoon} {t("expiring soon")}
        </Text>
      }
    >
      <Tabs>
        {TABS.map((option) => (
          <Tab
            key={option}
            active={tab === option}
            onClick={() => setTab(option)}
          >
            {t(option)}
          </Tab>
        ))}
      </Tabs>

      {tab === "Batches" ? (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
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
                          {t("expired")}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "Movements" ? (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
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
        </div>
      ) : null}

      {tab === "Purchase orders" ? (
        <Flex column>
          {purchaseOrders.map((order) => {
            const value = order.items.reduce(
              (total, item) => total + item.cost * item.quantity,
              0
            );
            const units = order.items.reduce(
              (total, item) => total + item.quantity,
              0
            );

            return (
              <ListItem
                key={order.id}
                title={order.number}
                subtitle={
                  <>
                    {order.supplierName} · {units} {t("units")} ·{" "}
                    {formatCurrency(value)} · {t("expected")}{" "}
                    {formatDate(order.expectedAt)}
                  </>
                }
                actions={
                  <Flex align="center" gap={8}>
                    <StatusChip status={order.status} />
                    {order.status !== "received" &&
                    order.status !== "cancelled" ? (
                      <Button
                        onClick={() => void receivePurchaseOrder(order.id)}
                      >
                        {t("Receive")}
                      </Button>
                    ) : null}
                  </Flex>
                }
                border
              />
            );
          })}
          {purchaseOrders.length === 0 ? (
            <Empty>{t("Nothing on order.")}</Empty>
          ) : null}
        </Flex>
      ) : null}

      {tab === "Suppliers" ? (
        <Flex column>
          {suppliers.map((supplier) => {
            const open = purchaseOrders.filter(
              (order) =>
                order.supplierId === supplier.id && order.status !== "received"
            ).length;

            return (
              <ListItem
                key={supplier.id}
                title={supplier.name}
                subtitle={
                  <>
                    {supplier.contact} · {supplier.phone} · {supplier.terms}
                  </>
                }
                actions={
                  <Text type="tertiary" size="small">
                    {open === 0
                      ? t("No open orders")
                      : `${open} ${open === 1 ? t("open order") : t("open orders")}`}
                  </Text>
                }
                border
              />
            );
          })}
          {suppliers.length === 0 ? (
            <Empty>{t("No suppliers yet.")}</Empty>
          ) : null}
        </Flex>
      ) : null}
    </AppPage>
  );
}

export default Inventory;
