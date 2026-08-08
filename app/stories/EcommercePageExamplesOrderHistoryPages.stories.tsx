import type { Meta, StoryObj } from "@storybook/react";
import { OrderHistoryPagesSimple } from "~/components/OrderHistoryPagesSimple";
import { OrderHistoryPagesWithInvoiceList } from "~/components/OrderHistoryPagesWithInvoiceList";
import { OrderHistoryPagesWithInvoiceListAndQuickActions } from "~/components/OrderHistoryPagesWithInvoiceListAndQuickActions";
import { OrderHistoryPagesWithInvoicePanels } from "~/components/OrderHistoryPagesWithInvoicePanels";
import { OrderHistoryPagesWithInvoiceTables } from "~/components/OrderHistoryPagesWithInvoiceTables";

const meta: Meta = {
  title: "Ecommerce/Page Examples/Order History Pages",
};

export default meta;

export const Simple: StoryObj = {
  render: () => <OrderHistoryPagesSimple />,
};

export const WithInvoiceList: StoryObj = {
  render: () => <OrderHistoryPagesWithInvoiceList />,
};

export const WithInvoiceListAndQuickActions: StoryObj = {
  render: () => <OrderHistoryPagesWithInvoiceListAndQuickActions />,
};

export const WithInvoicePanels: StoryObj = {
  render: () => <OrderHistoryPagesWithInvoicePanels />,
};

export const WithInvoiceTables: StoryObj = {
  render: () => <OrderHistoryPagesWithInvoiceTables />,
};
