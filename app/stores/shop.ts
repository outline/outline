import { create } from "zustand";
import type {
  Boarding,
  Customer,
  Order,
  Product,
  Room,
  Supplier,
  Warehouse,
  Batch,
  Movement,
  PurchaseOrder,
  Branch,
  Staff,
  Account,
  JournalEntry,
  Expense,
  Shift,
  Grooming,
  LoyaltyMovement,
  WhatsappTemplate,
  WhatsappMessage,
  Subscription,
  BillingInvoice,
} from "../../src/mocks/shop";

/** A room with the guests currently occupying it. */
export type RoomOccupancy = Room & {
  occupied: number;
  isFull: boolean;
  guests: {
    id: string;
    petName: string;
    customerName: string;
    checkOut: string;
  }[];
};

/** An account with its journal totals and resulting balance. */
export type TrialBalanceRow = Account & {
  debit: number;
  credit: number;
  balance: number;
};

/** Commission owed to one staff member. */
export type CommissionRow = {
  id: string;
  name: string;
  branch: string;
  role: string;
  rate: number;
  base: number;
  amount: number;
};

/** Usage of each plan limit. */
export type PlanUsage = {
  staff: { used: number; limit: number };
  branches: { used: number; limit: number };
  boardings: { used: number; limit: number };
};

/** A line on a point of sale ticket. */
export type CartLine = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};
import { client } from "~/utils/ApiClient";

/** The figures shown across the top of the pet store dashboard. */
export interface Dashboard {
  revenueToday: number;
  ordersToday: number;
  activeBoardings: number;
  arrivalsToday: number;
  occupancyRate: number;
  capacity: number;
  occupied: number;
  lowStock: number;
  unpaidOrders: number;
}

interface State {
  dashboard?: Dashboard;
  products: Product[];
  customers: Customer[];
  boardings: Boarding[];
  rooms: RoomOccupancy[];
  orders: Order[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  batches: Batch[];
  movements: Movement[];
  purchaseOrders: PurchaseOrder[];
  branches: Branch[];
  staff: Staff[];
  accounts: Account[];
  journal: JournalEntry[];
  expenses: Expense[];
  shifts: Shift[];
  grooming: Grooming[];
  loyalty: LoyaltyMovement[];
  whatsappTemplates: WhatsappTemplate[];
  whatsappMessages: WhatsappMessage[];
  subscription?: Subscription;
  billingInvoices: BillingInvoice[];
  usage?: PlanUsage;
  trialBalance: TrialBalanceRow[];
  commissions: CommissionRow[];
  isLoading: boolean;
  error?: string;
  fetchAll: () => Promise<void>;
  setBoardingStatus: (id: string, status: Boarding["status"]) => Promise<void>;
  adjustStock: (id: string, delta: number) => Promise<void>;
  createOrder: (items: CartLine[], customerName: string) => Promise<Order>;
  markOrderPaid: (id: string) => Promise<void>;
  receivePurchaseOrder: (id: string) => Promise<void>;
  setStaffStatus: (id: string, status: Staff["status"]) => Promise<void>;
  createRoom: (room: {
    name: string;
    branch: string;
    capacity: number;
    type: string;
  }) => Promise<void>;
  updateRoom: (
    id: string,
    changes: { name?: string; capacity?: number; type?: string }
  ) => Promise<void>;
  deleteRoom: (id: string) => Promise<boolean>;
  createExpense: (expense: {
    category: string;
    description: string;
    amount: number;
    paidFrom: string;
  }) => Promise<void>;
  setGroomingStatus: (id: string, status: Grooming["status"]) => Promise<void>;
  redeemPoints: (customerId: string, points: number) => Promise<boolean>;
  sendWhatsapp: (templateId: string, customerId: string) => Promise<boolean>;
  changePlan: (plan: "free" | "pro" | "business") => Promise<void>;
}

/**
 * State for the pet store domains.
 *
 * Everything is loaded in one pass because the pages share the same figures –
 * the dashboard totals are derived from the same records the list pages show.
 */
export const useShop = create<State>((set, get) => ({
  products: [],
  customers: [],
  boardings: [],
  rooms: [],
  orders: [],
  suppliers: [],
  warehouses: [],
  batches: [],
  movements: [],
  purchaseOrders: [],
  branches: [],
  staff: [],
  accounts: [],
  journal: [],
  expenses: [],
  shifts: [],
  grooming: [],
  loyalty: [],
  whatsappTemplates: [],
  whatsappMessages: [],
  billingInvoices: [],
  trialBalance: [],
  commissions: [],
  isLoading: false,

  fetchAll: async () => {
    set({ isLoading: true, error: undefined });

    try {
      const [
        dashboard,
        products,
        customers,
        boardings,
        rooms,
        orders,
        suppliers,
        warehouses,
        batches,
        movements,
        purchaseOrders,
        branches,
        staff,
        accounts,
        journal,
        expenses,
        shifts,
        trialBalance,
        commissions,
        grooming,
        loyalty,
        whatsappTemplates,
        whatsappMessages,
        subscription,
        billingInvoices,
        usage,
      ] = await Promise.all([
        client.post("/dashboard"),
        client.post("/products.list"),
        client.post("/customers.list"),
        client.post("/boardings.list"),
        client.post("/rooms.list"),
        client.post("/orders.list"),
        client.post("/suppliers.list"),
        client.post("/warehouses.list"),
        client.post("/batches.list"),
        client.post("/movements.list"),
        client.post("/purchaseOrders.list"),
        client.post("/branches.list"),
        client.post("/staff.list"),
        client.post("/accounts.list"),
        client.post("/journal.list"),
        client.post("/expenses.list"),
        client.post("/shifts.list"),
        client.post("/accounting.trialBalance"),
        client.post("/accounting.commissions"),
        client.post("/grooming.list"),
        client.post("/loyalty.list"),
        client.post("/whatsapp.templates"),
        client.post("/whatsapp.messages"),
        client.post("/billing.subscription"),
        client.post("/billing.invoices"),
        client.post("/billing.usage"),
      ]);

      set({
        dashboard: dashboard.data,
        products: products.data,
        customers: customers.data,
        boardings: boardings.data,
        rooms: rooms.data,
        orders: orders.data,
        suppliers: suppliers.data,
        warehouses: warehouses.data,
        batches: batches.data,
        movements: movements.data,
        purchaseOrders: purchaseOrders.data,
        branches: branches.data,
        staff: staff.data,
        accounts: accounts.data,
        journal: journal.data,
        expenses: expenses.data,
        shifts: shifts.data,
        trialBalance: trialBalance.data,
        commissions: commissions.data,
        grooming: grooming.data,
        loyalty: loyalty.data,
        whatsappTemplates: whatsappTemplates.data,
        whatsappMessages: whatsappMessages.data,
        subscription: subscription.data,
        billingInvoices: billingInvoices.data,
        usage: usage.data,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to load",
      });
    }
  },

  setBoardingStatus: async (id, status) => {
    // Applied optimistically; the list reflects the change before the round trip.
    set((state) => ({
      boardings: state.boardings.map((boarding) =>
        boarding.id === id ? { ...boarding, status } : boarding
      ),
    }));

    await client.post("/boardings.updateStatus", { id, status });
    await get().fetchAll();
  },

  adjustStock: async (id, delta) => {
    set((state) => ({
      products: state.products.map((product) =>
        product.id === id
          ? { ...product, stock: Math.max(0, product.stock + delta) }
          : product
      ),
    }));

    await client.post("/products.adjustStock", { id, delta });
    await get().fetchAll();
  },

  createOrder: async (items, customerName) => {
    const response = await client.post("/orders.create", {
      items,
      customerName,
    });
    await get().fetchAll();
    return response.data;
  },

  markOrderPaid: async (id) => {
    await client.post("/orders.markPaid", { id });
    await get().fetchAll();
  },

  receivePurchaseOrder: async (id) => {
    await client.post("/purchaseOrders.receive", { id });
    await get().fetchAll();
  },

  setStaffStatus: async (id, status) => {
    await client.post("/staff.setStatus", { id, status });
    await get().fetchAll();
  },

  createRoom: async (room) => {
    await client.post("/rooms.create", room);
    await get().fetchAll();
  },

  updateRoom: async (id, changes) => {
    await client.post("/rooms.update", { id, ...changes });
    await get().fetchAll();
  },

  deleteRoom: async (id) => {
    const response = await client.post("/rooms.delete", { id });
    await get().fetchAll();
    return Boolean(response.data?.deleted);
  },

  createExpense: async (expense) => {
    await client.post("/expenses.create", expense);
    await get().fetchAll();
  },

  setGroomingStatus: async (id, status) => {
    await client.post("/grooming.setStatus", { id, status });
    await get().fetchAll();
  },

  sendWhatsapp: async (templateId, customerId) => {
    const response = await client.post("/whatsapp.send", {
      templateId,
      customerId,
    });
    await get().fetchAll();
    return Boolean(response.data?.sent);
  },

  changePlan: async (plan) => {
    await client.post("/billing.changePlan", { plan });
    await get().fetchAll();
  },

  redeemPoints: async (customerId, points) => {
    const response = await client.post("/loyalty.redeem", {
      customerId,
      points,
    });
    await get().fetchAll();
    return Boolean(response.data?.redeemed);
  },
}));
