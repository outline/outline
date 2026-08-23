import { create } from "zustand";
import type {
  Boarding,
  Customer,
  Order,
  Product,
  ProductVariant,
  Pet,
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
  PortalService,
  PortalReview,
  Invoice,
  Advance,
  PurchaseOrderItem,
  DocumentTemplate,
  Return,
  AuditEntry,
  Insight,
} from "../../src/mocks/shop";
import type {
  TCustomerRecordDto,
  TPetDto,
  TProductDto,
  TStaffMemberDto,
  TBranchDto,
} from "@treonstudio/petso-lib";
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
/** A line on an invoice being drafted. */
export type InvoiceLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
};
/** An invoice with its money worked out by the mock. */
export type PricedInvoice = Invoice & {
  subtotal: number;
  tax: number;
  total: number;
  paid: number;
  due: number;
  status: "void" | "paid" | "partial" | "unpaid";
  isOverdue: boolean;
};
/** An advance with the balance worked out by the mock. */
export type PricedAdvance = Advance & {
  repaid: number;
  remaining: number;
  status: "active" | "paid_off";
};
/** What the portal is answerable for. */
export interface PortalStats {
  reviews: number;
  averageRating: number;
  activeServices: number;
  totalServices: number;
  pets: number;
  portalBookings: number;
  enabled: boolean;
  slug: string;
}
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
  staff: {
    used: number;
    limit: number;
  };
  branches: {
    used: number;
    limit: number;
  };
  boardings: {
    used: number;
    limit: number;
  };
};
/** A line on a point of sale ticket. */
export type CartLine = {
  productId: string;
  /** Set when the line is a particular size of the product. */
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
};
import type { JSONObject } from "@shared/types";
import { client } from "~/utils/ApiClient";
import { petsoClient } from "~/utils/petsoClient";

function mapProduct(product: TProductDto): Product {
  const variants: ProductVariant[] = product.variants.map((variant) => ({
    id: variant.id,
    name: variant.name,
    sku: variant.sku ?? "",
    price: variant.price,
    stock: variant.stock,
  }));
  const firstVariant = product.variants[0];
  return {
    id: product.id,
    sku: firstVariant?.sku ?? "",
    name: product.name,
    category: product.category ?? "",
    price: firstVariant?.price ?? 0,
    stock: firstVariant?.stock ?? 0,
    reorderLevel: firstVariant?.lowStockThreshold ?? 0,
    supplier: "",
    status: product.isActive ? "active" : "archived",
    ...(variants.length > 0 ? { variants } : {}),
  };
}

function mapBranch(branch: TBranchDto): Branch {
  return {
    id: branch.id,
    name: branch.name,
    address: branch.address ?? "",
    phone: branch.phone ?? "",
    manager: "",
  };
}

function mapCustomer(
  customer: TCustomerRecordDto,
  pets: readonly TPetDto[]
): Customer {
  return {
    id: customer.id,
    name: customer.fullName,
    phone: customer.phone,
    email: customer.email ?? "",
    pets: pets
      .filter((pet) => pet.customerId === customer.id)
      .map(
        (pet): Pet => ({
          id: pet.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed ?? "",
        })
      ),
    loyaltyPoints: 0,
    joinedAt: customer.createdAt,
  };
}

function mapStaff(member: TStaffMemberDto): Staff {
  const roles: Staff["role"][] = [
    "owner",
    "manager",
    "groomer",
    "cashier",
    "caretaker",
  ];
  const role = roles.find((value) => value === member.role) ?? "caretaker";
  return {
    id: member.userId,
    name: member.fullName,
    email: member.email,
    role,
    branch: member.branches[0]?.name ?? "",
    phone: "",
    status: "active",
    commissionRate: 0,
  };
}
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
  invoices: PricedInvoice[];
  advances: PricedAdvance[];
  returns: Return[];
  audit: AuditEntry[];
  insights: Insight[];
  trend: {
    date: string;
    revenue: number;
    orders: number;
  }[];
  topSellers: {
    name: string;
    units: number;
    revenue: number;
  }[];
  onShift: {
    staffId: string;
    staffName: string;
    since: string;
  }[];
  branchHolidays: {
    id: string;
    branch: string;
    date: string;
    reason: string;
  }[];
  onboarding: {
    id: string;
    title: string;
    done: boolean;
    path: string;
  }[];
  groomingCalendar: {
    groomerId: string;
    groomerName: string;
    branch: string;
    days: {
      date: string;
      isClosed: boolean;
      appointments: {
        id: string;
        petName: string;
        customerName: string;
        service: string;
        status: string;
        price: number;
      }[];
    }[];
  }[];
  staffInvites: {
    id: string;
    email: string;
    name: string;
    role: string;
    branch: string;
    status: string;
    sentAt: string;
  }[];
  calendar: {
    roomId: string;
    roomName: string;
    branch: string;
    capacity: number;
    days: {
      date: string;
      occupied: number;
      isFull: boolean;
      isClosed: boolean;
      guests: {
        boardingId: string;
        petName: string;
        customerName: string;
      }[];
    }[];
  }[];
  cashFlow: {
    accountId: string;
    name: string;
    opening: number;
    received: number;
    paid: number;
    closing: number;
  }[];
  loyaltyConfig?: {
    rupiahPerPoint: number;
    tiers: {
      name: string;
      from: number;
    }[];
  };
  noteTemplates: DocumentTemplate[];
  portalStats?: PortalStats;
  portalServices: PortalService[];
  portalReviews: PortalReview[];
  isLoading: boolean;
  error?: string;
  fetchAll: () => Promise<void>;
  createInvoice: (invoice: {
    customerName: string;
    dueDate: string;
    notes: string;
    items: InvoiceLine[];
  }) => Promise<{
    created: boolean;
    invoice?: PricedInvoice;
  }>;
  recordInvoicePayment: (
    id: string,
    amount: number,
    method: "cash" | "bank",
    reference: string
  ) => Promise<{
    recorded: boolean;
    reason?: string;
    due?: number;
  }>;
  voidInvoice: (id: string) => Promise<{
    voided: boolean;
    reason?: string;
  }>;
  createPortalService: (service: {
    name: string;
    description: string;
    category: string;
    durationMinutes: number;
    price: number;
  }) => Promise<boolean>;
  setPortalServiceActive: (id: string, isActive: boolean) => Promise<void>;
  deletePortalService: (id: string) => Promise<void>;
  /** Fields left out are kept as they are, so a blank does not wipe them. */
  savePortalSettings: (settings: {
    name?: string;
    tagline?: string;
    slug?: string;
    portalEnabled?: boolean;
  }) => Promise<{
    saved: boolean;
    reason?: string;
  }>;
  saveNoteTemplate: (
    template: Partial<DocumentTemplate> & {
      type: DocumentTemplate["type"];
    }
  ) => Promise<{
    saved: boolean;
    reason?: string;
  }>;
  /** Creates when no id is given, edits in place when one is. */
  createReturn: (input: {
    orderId: string;
    reason: string;
    refundMethod: "cash" | "bank";
    items: {
      productId: string;
      variantId?: string;
      quantity: number;
      isDamaged: boolean;
    }[];
  }) => Promise<{
    created: boolean;
    reason?: string;
    refundable?: number;
  }>;
  /** Creates when no id is given, edits in place when one is. */
  saveProduct: (product: {
    id?: string;
    name: string;
    sku: string;
    price: number;
    category: string;
    stock?: number;
    reorderLevel?: number;
    supplier?: string;
  }) => Promise<{
    saved: boolean;
    reason?: string;
  }>;
  deleteProduct: (id: string) => Promise<{
    removed: boolean;
    reason?: string;
  }>;
  saveCustomer: (customer: {
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    pets?: Pet[];
  }) => Promise<{
    saved: boolean;
    reason?: string;
  }>;
  deleteCustomer: (id: string) => Promise<{
    removed: boolean;
    reason?: string;
  }>;
  saveStaff: (member: {
    id?: string;
    name: string;
    email: string;
    role: string;
    branch: string;
    phone?: string;
    commissionRate?: number;
  }) => Promise<{
    saved: boolean;
    reason?: string;
  }>;
  deleteStaff: (id: string) => Promise<{
    removed: boolean;
    reason?: string;
  }>;
  saveSupplier: (supplier: {
    id?: string;
    name: string;
    contact?: string;
    phone?: string;
    terms?: string;
  }) => Promise<{
    saved: boolean;
    reason?: string;
  }>;
  deleteSupplier: (id: string) => Promise<{
    removed: boolean;
    reason?: string;
  }>;
  saveWarehouse: (warehouse: {
    id?: string;
    name: string;
    branch: string;
  }) => Promise<{
    saved: boolean;
    reason?: string;
  }>;
  deleteWarehouse: (id: string) => Promise<{
    removed: boolean;
    reason?: string;
  }>;
  inviteStaff: (invite: {
    email: string;
    name: string;
    role: string;
    branch: string;
  }) => Promise<{
    sent: boolean;
    reason?: string;
  }>;
  acceptInvite: (id: string) => Promise<{
    accepted: boolean;
  }>;
  withdrawInvite: (id: string) => Promise<void>;
  addHoliday: (holiday: {
    branch: string;
    date: string;
    reason: string;
  }) => Promise<{
    saved: boolean;
    reason?: string;
  }>;
  removeHoliday: (id: string) => Promise<void>;
  saveBranch: (branch: {
    id?: string;
    name: string;
    address?: string;
    phone?: string;
    manager?: string;
  }) => Promise<{
    saved: boolean;
    reason?: string;
  }>;
  deleteBranch: (id: string) => Promise<{
    removed: boolean;
    reason?: string;
  }>;
  saveLoyaltyConfig: (config: {
    rupiahPerPoint?: number;
    tiers?: {
      name: string;
      from: number;
    }[];
  }) => Promise<{
    saved: boolean;
    reason?: string;
  }>;
  clockIn: (staffId: string) => Promise<{
    ok: boolean;
    reason?: string;
  }>;
  clockOut: (staffId: string) => Promise<{
    ok: boolean;
    reason?: string;
  }>;
  createAdvance: (advance: {
    staffId: string;
    amount: number;
    installment: number;
    notes: string;
  }) => Promise<boolean>;
  repayAdvance: (
    id: string,
    amount: number,
    source: "manual" | "commission"
  ) => Promise<{
    repaid: boolean;
    reason?: string;
    remaining?: number;
  }>;
  createPurchaseOrder: (order: {
    supplierId: string;
    expectedAt: string;
    items: Omit<PurchaseOrderItem, "received">[];
  }) => Promise<{
    created: boolean;
    order?: PurchaseOrder;
  }>;
  setBoardingStatus: (id: string, status: Boarding["status"]) => Promise<void>;
  createBoarding: (boarding: {
    customerName: string;
    petName: string;
    roomId: string;
    checkIn: string;
    checkOut: string;
  }) => Promise<{
    created: boolean;
    reason?: string;
    boarding?: Boarding;
  }>;
  adjustStock: (id: string, delta: number) => Promise<void>;
  createOrder: (items: CartLine[], customerName: string) => Promise<Order>;
  markOrderPaid: (id: string) => Promise<void>;
  voidOrder: (id: string) => Promise<{
    voided: boolean;
    reason?: string;
  }>;
  /** Quantities per product id; omit to receive everything outstanding. */
  receivePurchaseOrder: (
    id: string,
    quantities?: Record<string, number>
  ) => Promise<{
    received: boolean;
    reason?: string;
  }>;
  setStaffStatus: (id: string, status: Staff["status"]) => Promise<void>;
  createRoom: (room: {
    name: string;
    branch: string;
    capacity: number;
    type: string;
  }) => Promise<void>;
  updateRoom: (
    id: string,
    changes: {
      name?: string;
      capacity?: number;
      type?: string;
    }
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
 * Posts a change and reloads when it took.
 *
 * The master data pages all save and remove the same way, so the round trip
 * lives here rather than being repeated a dozen times.
 *
 * @param path the endpoint to post to.
 * @param body what to send.
 * @param get the store accessor, for reloading.
 * @returns the mock's answer.
 */
async function write<
  T extends {
    saved?: boolean;
    removed?: boolean;
  },
>(path: string, body: JSONObject, get: () => State): Promise<T> {
  const response = await client.post(path, body);
  if (response.data?.saved || response.data?.removed) {
    await get().fetchAll();
  }
  return response.data as T;
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
  invoices: [],
  advances: [],
  returns: [],
  audit: [],
  insights: [],
  trend: [],
  topSellers: [],
  onShift: [],
  branchHolidays: [],
  onboarding: [],
  groomingCalendar: [],
  staffInvites: [],
  calendar: [],
  cashFlow: [],
  noteTemplates: [],
  portalServices: [],
  portalReviews: [],
  isLoading: false,
  fetchAll: async () => {
    set({ isLoading: true, error: undefined });
    try {
      const [
        dashboard,
        productDtos,
        customerDtos,
        petDtos,
        boardings,
        rooms,
        orders,
        suppliers,
        warehouses,
        batches,
        movements,
        purchaseOrders,
        branches,
        staffDtos,
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
        invoices,
        portalStats,
        portalServices,
        portalReviews,
        advances,
        noteTemplates,
        returns,
        audit,
        insights,
        trend,
        topSellers,
        onShift,
        cashFlow,
        loyaltyConfig,
        branchHolidays,
        calendar,
        onboarding,
        staffInvites,
        groomingCalendar,
      ] = await Promise.all([
        client.post("/dashboard"),
        petsoClient.admin.products(),
        petsoClient.admin.customers(),
        petsoClient.admin.pets(),
        client.post("/boardings.list"),
        client.post("/rooms.list"),
        client.post("/orders.list"),
        client.post("/suppliers.list"),
        client.post("/warehouses.list"),
        client.post("/batches.list"),
        client.post("/movements.list"),
        client.post("/purchaseOrders.list"),
        petsoClient.branches.list(),
        petsoClient.admin.staff(),
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
        client.post("/invoices.list"),
        client.post("/portal.stats"),
        client.post("/portal.services.list"),
        client.post("/portal.reviews.list"),
        client.post("/advances.list"),
        client.post("/documentTemplates.list"),
        client.post("/returns.list"),
        client.post("/audit.list"),
        client.post("/insights.list"),
        client.post("/dashboard.trend", { days: 14 }),
        client.post("/dashboard.topSellers"),
        client.post("/shifts.onShift"),
        client.post("/accounting.cashFlow"),
        client.post("/loyalty.config"),
        client.post("/branches.holidays"),
        client.post("/occupancy.calendar", { days: 14 }),
        client.post("/onboarding.steps"),
        client.post("/staff.invites"),
        client.post("/grooming.calendar", { days: 14 }),
      ]);
      set({
        dashboard: dashboard.data,
        products: productDtos.map(mapProduct),
        customers: customerDtos.map((customer) =>
          mapCustomer(customer, petDtos)
        ),
        boardings: boardings.data,
        rooms: rooms.data,
        orders: orders.data,
        suppliers: suppliers.data,
        warehouses: warehouses.data,
        batches: batches.data,
        movements: movements.data,
        purchaseOrders: purchaseOrders.data,
        branches: branches.map(mapBranch),
        staff: staffDtos.map(mapStaff),
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
        invoices: invoices.data,
        portalStats: portalStats.data,
        portalServices: portalServices.data,
        portalReviews: portalReviews.data,
        advances: advances.data,
        noteTemplates: noteTemplates.data,
        returns: returns.data,
        audit: audit.data,
        insights: insights.data,
        trend: trend.data,
        topSellers: topSellers.data,
        onShift: onShift.data,
        cashFlow: cashFlow.data,
        loyaltyConfig: loyaltyConfig.data,
        branchHolidays: branchHolidays.data,
        calendar: calendar.data,
        onboarding: onboarding.data,
        staffInvites: staffInvites.data,
        groomingCalendar: groomingCalendar.data,
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
  createInvoice: async (invoice) => {
    const response = await client.post("/invoices.create", invoice);
    if (response.data?.created) {
      await get().fetchAll();
    }
    return response.data;
  },
  recordInvoicePayment: async (id, amount, method, reference) => {
    const response = await client.post("/invoices.recordPayment", {
      id,
      amount,
      method,
      reference,
    });
    if (response.data?.recorded) {
      await get().fetchAll();
    }
    return response.data;
  },
  voidInvoice: async (id) => {
    const response = await client.post("/invoices.void", { id });
    if (response.data?.voided) {
      await get().fetchAll();
    }
    return response.data;
  },
  createPortalService: async (service) => {
    const response = await client.post("/portal.services.create", service);
    if (response.data?.created) {
      await get().fetchAll();
    }
    return Boolean(response.data?.created);
  },
  setPortalServiceActive: async (id, isActive) => {
    await client.post("/portal.services.setActive", { id, isActive });
    await get().fetchAll();
  },
  deletePortalService: async (id) => {
    await client.post("/portal.services.delete", { id });
    await get().fetchAll();
  },
  savePortalSettings: async (settings) => {
    const response = await client.post("/portal.settings.update", settings);
    if (response.data?.saved) {
      await get().fetchAll();
    }
    return response.data;
  },
  createBoarding: async (boarding) => {
    // Not optimistic: the room may be taken for those nights, and the answer
    // decides whether the form clears or reports why it could not.
    const response = await client.post("/boardings.create", boarding);
    if (response.data?.created) {
      await get().fetchAll();
    }
    return response.data;
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
  voidOrder: async (id) => {
    const response = await client.post("/orders.void", { id });
    if (response.data?.voided) {
      await get().fetchAll();
    }
    return response.data;
  },
  receivePurchaseOrder: async (id, quantities) => {
    const response = await client.post("/purchaseOrders.receive", {
      id,
      quantities,
    });
    if (response.data?.received) {
      await get().fetchAll();
    }
    return response.data;
  },
  createPurchaseOrder: async (order) => {
    const response = await client.post("/purchaseOrders.create", order);
    if (response.data?.created) {
      await get().fetchAll();
    }
    return response.data;
  },
  saveNoteTemplate: async (template) => {
    const response = await client.post("/documentTemplates.save", template);
    if (response.data?.saved) {
      await get().fetchAll();
    }
    return response.data;
  },
  createReturn: async (input) => {
    const response = await client.post("/returns.create", input);
    if (response.data?.created) {
      await get().fetchAll();
    }
    return response.data;
  },
  saveProduct: async (product) => write("/products.save", product, get),
  deleteProduct: async (id) => write("/products.delete", { id }, get),
  saveCustomer: async (customer) => write("/customers.save", customer, get),
  deleteCustomer: async (id) => write("/customers.delete", { id }, get),
  saveStaff: async (member) => write("/staff.save", member, get),
  deleteStaff: async (id) => write("/staff.delete", { id }, get),
  saveSupplier: async (supplier) => write("/suppliers.save", supplier, get),
  deleteSupplier: async (id) => write("/suppliers.delete", { id }, get),
  saveWarehouse: async (warehouse) => write("/warehouses.save", warehouse, get),
  deleteWarehouse: async (id) => write("/warehouses.delete", { id }, get),
  inviteStaff: async (invite) => {
    const response = await client.post("/staff.invite", invite);
    if (response.data?.sent) {
      await get().fetchAll();
    }
    return response.data;
  },
  acceptInvite: async (id) => {
    const response = await client.post("/staff.acceptInvite", { id });
    if (response.data?.accepted) {
      await get().fetchAll();
    }
    return response.data;
  },
  withdrawInvite: async (id) => {
    await client.post("/staff.withdrawInvite", { id });
    await get().fetchAll();
  },
  addHoliday: async (holiday) => write("/branches.addHoliday", holiday, get),
  removeHoliday: async (id) => {
    await client.post("/branches.removeHoliday", { id });
    await get().fetchAll();
  },
  saveBranch: async (branch) => write("/branches.save", branch, get),
  deleteBranch: async (id) => write("/branches.delete", { id }, get),
  saveLoyaltyConfig: async (config) => {
    const response = await client.post("/loyalty.saveConfig", config);
    if (response.data?.saved) {
      await get().fetchAll();
    }
    return response.data;
  },
  clockIn: async (staffId) => {
    const response = await client.post("/shifts.clockIn", { staffId });
    if (response.data?.ok) {
      await get().fetchAll();
    }
    return response.data;
  },
  clockOut: async (staffId) => {
    const response = await client.post("/shifts.clockOut", { staffId });
    if (response.data?.ok) {
      await get().fetchAll();
    }
    return response.data;
  },
  createAdvance: async (advance) => {
    const response = await client.post("/advances.create", advance);
    if (response.data?.created) {
      await get().fetchAll();
    }
    return Boolean(response.data?.created);
  },
  repayAdvance: async (id, amount, source) => {
    const response = await client.post("/advances.repay", {
      id,
      amount,
      source,
    });
    if (response.data?.repaid) {
      await get().fetchAll();
    }
    return response.data;
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
