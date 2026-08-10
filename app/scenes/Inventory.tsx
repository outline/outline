import { useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { useHistory } from "react-router-dom";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import { StatusChip } from "~/components/StatusChip";
import { Tab, Tabs } from "~/components/Tabs";
import Text from "~/components/Text";
import { AppPage } from "~/components/AppPage";
import {
  Card,
  TBody,
  THead,
  Table,
  Td,
  TdMono,
  Th,
} from "~/components/Surface";
import { canAccessRoute } from "../../src/mocks/access";
import { currentRole } from "../../src/mocks/shop";
import { SchemaForm } from "~/components/SchemaForm";
import { SupplierDocType, warehouseDocType } from "~/utils/doctypes";
import Subheading from "~/components/Subheading";
import { useShop } from "~/stores/shop";
import { formatCurrency, formatDate } from "~/utils/format";

/** How close a batch is to its expiry date, which sets how loudly it reads. */
const Expiry = styled.span<{ $urgency: "past" | "soon" | "later" }>`
  font-weight: ${({ $urgency }) => ($urgency === "later" ? 400 : 600)};
  color: ${({ $urgency, theme }) =>
    $urgency === "past"
      ? theme.danger
      : $urgency === "soon"
        ? theme.warning
        : theme.text};
`;

/**
 * The tabs, and the page whose permission each one borrows.
 *
 * Stock levels are everyone's business, but who the shop buys from and what
 * is on order are a manager's, so those tabs are only offered to people who
 * could open those pages directly.
 */
const TABS = [
  { name: "Batches", route: "/inventory" },
  { name: "Movements", route: "/inventory" },
  { name: "Purchase orders", route: "/purchase-orders" },
  { name: "Suppliers", route: "/suppliers" },
  { name: "Warehouses", route: "/warehouses" },
] as const;

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
  const history = useHistory();
  const batches = useShop((state) => state.batches);
  const movements = useShop((state) => state.movements);
  const purchaseOrders = useShop((state) => state.purchaseOrders);
  const suppliers = useShop((state) => state.suppliers);
  const warehouses = useShop((state) => state.warehouses);
  const branches = useShop((state) => state.branches);
  const saveSupplier = useShop((state) => state.saveSupplier);
  const deleteSupplier = useShop((state) => state.deleteSupplier);
  const saveWarehouse = useShop((state) => state.saveWarehouse);
  const deleteWarehouse = useShop((state) => state.deleteWarehouse);

  const role = currentRole();
  const tabs = TABS.filter(
    (option) => role && canAccessRoute(role, option.route)
  );
  const [tab, setTab] = useState<string>("Batches");

  /** Whether a tab's content may be rendered, not merely offered. */
  const allowed = (name: string) => tabs.some((option) => option.name === name);
  const [notice, setNotice] = useState<string | undefined>();

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
        {tabs.map((option) => (
          <Tab
            key={option.name}
            active={tab === option.name}
            onClick={() => setTab(option.name)}
          >
            {t(option.name)}
          </Tab>
        ))}
      </Tabs>

      {notice ? (
        <Text as="p" type="secondary" data-testid="inventory-notice">
          {notice}
        </Text>
      ) : null}

      {tab === "Batches" ? (
        <Card>
          <Table>
            <THead>
              <tr>
                {["Lot", "Product", "Warehouse", "Qty", "Expires"].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </THead>
            <TBody>
              {batches.map((batch) => {
                const days =
                  (new Date(batch.expiresAt).getTime() - Date.now()) / 86400000;
                return (
                  <tr key={batch.id}>
                    <TdMono>{batch.lot}</TdMono>
                    <Td>{batch.productName}</Td>
                    <Td>{warehouseName(batch.warehouseId)}</Td>
                    <Td>{batch.quantity}</Td>
                    <Td>
                      <Expiry
                        $urgency={
                          days < 0 ? "past" : days <= 30 ? "soon" : "later"
                        }
                      >
                        {formatDate(batch.expiresAt)}
                      </Expiry>
                      {days < 0 ? (
                        <Text
                          as="span"
                          size="xsmall"
                          type="danger"
                          style={{ display: "block" }}
                        >
                          {t("expired")}
                        </Text>
                      ) : null}
                    </Td>
                  </tr>
                );
              })}
            </TBody>
          </Table>
        </Card>
      ) : null}

      {tab === "Movements" ? (
        <Card>
          <Table>
            <THead>
              <tr>
                {[
                  "Date",
                  "Product",
                  "Warehouse",
                  "Type",
                  "Qty",
                  "Reference",
                ].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </THead>
            <TBody>
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <Td>{formatDate(movement.createdAt)}</Td>
                  <Td>{movement.productName}</Td>
                  <Td>{warehouseName(movement.warehouseId)}</Td>
                  <Td>
                    <StatusChip status={movement.type} />
                  </Td>
                  <Td>
                    {movement.quantity > 0
                      ? `+${movement.quantity}`
                      : movement.quantity}
                  </Td>
                  <TdMono>{movement.reference}</TdMono>
                </tr>
              ))}
            </TBody>
          </Table>
        </Card>
      ) : null}

      {tab === "Purchase orders" && allowed("Purchase orders") ? (
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
                  // Booking in a delivery happens on the order's own page,
                  // where each line takes its own quantity – there is no
                  // second, all-or-nothing path to keep in step.
                  <Flex align="center" gap={8}>
                    <StatusChip status={order.status} />
                    <Button
                      neutral
                      borderOnHover
                      onClick={() =>
                        history.push(`/purchase-orders/${order.id}`)
                      }
                    >
                      {t("Open")}
                    </Button>
                  </Flex>
                }
                border
              />
            );
          })}
          {purchaseOrders.length === 0 ? (
            <Empty>{t("Nothing on order.")}</Empty>
          ) : null}
          <Flex style={{ paddingTop: 16 }}>
            <Button
              neutral
              borderOnHover
              onClick={() => history.push("/purchase-orders")}
            >
              {t("All purchase orders")}
            </Button>
          </Flex>
        </Flex>
      ) : null}

      {tab === "Suppliers" && allowed("Suppliers") ? (
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
                  <Flex align="center" gap={8}>
                    <Text type="tertiary" size="small">
                      {open === 0
                        ? t("No open orders")
                        : `${open} ${open === 1 ? t("open order") : t("open orders")}`}
                    </Text>
                    <Button
                      neutral
                      borderOnHover
                      onClick={() =>
                        void deleteSupplier(supplier.id).then((result) => {
                          if (!result?.removed) {
                            setNotice(
                              t(
                                "{{name}} still has an order open, so it was kept.",
                                { name: supplier.name }
                              )
                            );
                          }
                        })
                      }
                    >
                      {t("Remove")}
                    </Button>
                  </Flex>
                }
                border
              />
            );
          })}
          {suppliers.length === 0 ? (
            <Empty>{t("No suppliers yet.")}</Empty>
          ) : null}

          <Subheading>{t("Add a supplier")}</Subheading>
          <SchemaForm
            doctype={SupplierDocType}
            submitLabel="Add supplier"
            onSubmit={(values) => {
              setNotice(undefined);
              void saveSupplier({
                name: values.name ?? "",
                contact: values.contact ?? "",
                phone: values.phone ?? "",
                terms: values.terms ?? "Net 30",
              }).then((result) => {
                if (!result?.saved) {
                  setNotice(t("A supplier needs a name."));
                }
              });
            }}
          />
        </Flex>
      ) : null}

      {tab === "Warehouses" && allowed("Warehouses") ? (
        <Flex column>
          {warehouses.map((warehouse) => {
            const held = batches.filter(
              (batch) => batch.warehouseId === warehouse.id
            );
            const units = held.reduce((sum, batch) => sum + batch.quantity, 0);

            return (
              <ListItem
                key={warehouse.id}
                title={warehouse.name}
                subtitle={
                  <>
                    {warehouse.branch} · {held.length}{" "}
                    {held.length === 1 ? t("batch") : t("batches")} · {units}{" "}
                    {t("units")}
                  </>
                }
                actions={
                  <Button
                    neutral
                    borderOnHover
                    onClick={() =>
                      void deleteWarehouse(warehouse.id).then((result) => {
                        if (!result?.removed) {
                          setNotice(
                            t("{{name}} still holds stock, so it was kept.", {
                              name: warehouse.name,
                            })
                          );
                        }
                      })
                    }
                  >
                    {t("Remove")}
                  </Button>
                }
                border
              />
            );
          })}
          {warehouses.length === 0 ? (
            <Empty>{t("No warehouses yet.")}</Empty>
          ) : null}

          <Subheading>{t("Add a warehouse")}</Subheading>
          <SchemaForm
            doctype={warehouseDocType(branches.map((branch) => branch.name))}
            submitLabel="Add warehouse"
            onSubmit={(values) => {
              setNotice(undefined);
              void saveWarehouse({
                name: values.name ?? "",
                branch: values.branch ?? branches[0]?.name ?? "",
              }).then((result) => {
                if (!result?.saved) {
                  setNotice(t("A warehouse needs a name."));
                }
              });
            }}
          />
        </Flex>
      ) : null}
    </AppPage>
  );
}

export default Inventory;
