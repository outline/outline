import type { Meta, StoryObj } from "@storybook/react";
import { OrderHistoryInvoiceList } from "~/components/OrderHistoryInvoiceList";
import { OrderHistoryInvoiceListWithQuickActions } from "~/components/OrderHistoryInvoiceListWithQuickActions";
import { OrderHistoryInvoicePanels } from "~/components/OrderHistoryInvoicePanels";
import { OrderHistoryInvoiceTable } from "~/components/OrderHistoryInvoiceTable";

const meta: Meta = {
  title: "Ecommerce/Components/Order History",
};

export default meta;

export const InvoiceList: StoryObj = {
  render: () => <OrderHistoryInvoiceList />,
};

export const InvoiceListWithQuickActions: StoryObj = {
  render: () => <OrderHistoryInvoiceListWithQuickActions />,
};

export const InvoicePanels: StoryObj = {
  render: () => <OrderHistoryInvoicePanels />,
};

export const InvoiceTable: StoryObj = {
  render: () => <OrderHistoryInvoiceTable />,
};
