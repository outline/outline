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
  TInventorySnapshot,
  TOrderDto,
  TPurchaseOrderDto,
  TPetDto,
  TProductDto,
  TStaffMemberDto,
  TSupplierDto,
  TWarehouseDto,
  TBranchDto,
  TRoomDto,
  TInvoiceDto,
  TBoardingDto,
  TGroomingAppointmentDto,
  TDocumentTemplateDto,
  TBranchHolidayDto,
  TExpenseDto,
  TAccountingDashboardMetricsDto,
  TAccountDto,
  TJournalEntryDto,
  TCommissionReportDto,
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

function mapInventoryBatch(
  batch: TInventorySnapshot["batches"][number],
  productNames: ReadonlyMap<string, string>
): Batch {
  return {
    id: batch.id,
    productId: batch.variantId,
    productName: productNames.get(batch.variantId) ?? "",
    warehouseId: "",
    lot: batch.batchNumber ?? "",
    quantity: batch.quantity,
    expiresAt: batch.expiryDate ?? "",
  };
}

function mapInventoryMovement(
  movement: TInventorySnapshot["movements"][number],
  productNames: ReadonlyMap<string, string>
): Movement {
  const types: Movement["type"][] = ["in", "out", "transfer", "adjustment"];
  return {
    id: movement.id,
    productId: movement.variantId,
    productName: productNames.get(movement.variantId) ?? "",
    warehouseId: "",
    type: types.find((type) => type === movement.type) ?? "adjustment",
    quantity: movement.quantity,
    reference: movement.referenceId ?? movement.referenceType ?? "",
    createdAt: movement.createdAt,
  };
}

function mapOrder(order: TOrderDto): Order {
  const isVoided = Boolean(order.voidedAt) || order.status === "voided";
  const isPaid = (order.payments?.length ?? 0) > 0;
  return {
    id: order.id,
    number: order.id,
    customerName: order.customerId ?? "Walk-in customer",
    channel: "pos",
    soldById: order.createdBy,
    total: order.totalAmount,
    paidAt: isPaid ? (order.payments?.[0]?.createdAt ?? null) : null,
    status: isVoided ? "void" : isPaid ? "paid" : "draft",
    items: order.items.map((item) => ({
      orderItemId: item.id,
      productId: item.productId,
      ...(item.variantId ? { variantId: item.variantId } : {}),
      name: item.productName ?? item.productId,
      quantity: item.quantity,
      price: item.priceAtTime,
    })),
  };
}

function mapSupplier(supplier: TSupplierDto): Supplier {
  return {
    id: supplier.id,
    name: supplier.name,
    contact: supplier.contactPerson ?? "",
    phone: supplier.phone ?? "",
    terms: supplier.notes ?? "",
  };
}

function mapWarehouse(
  warehouse: TWarehouseDto,
  branchNames: ReadonlyMap<string, string>
): Warehouse {
  return {
    id: warehouse.id,
    name: warehouse.name,
    branch: branchNames.get(warehouse.branchId) ?? warehouse.branchId,
  };
}

function mapRoom(
  room: TRoomDto,
  branchNames: ReadonlyMap<string, string>
): RoomOccupancy {
  return {
    id: room.id,
    name: room.name,
    branch: room.branchId
      ? (branchNames.get(room.branchId) ?? room.branchId)
      : "",
    capacity: room.capacity,
    type: room.roomType === "vip" ? "suite" : (room.roomType as Room["type"]),
    occupied: 0,
    isFull: false,
    guests: [],
  };
}

function mapPurchaseOrder(
  order: TPurchaseOrderDto,
  productNames: ReadonlyMap<string, string>,
  supplierNames: ReadonlyMap<string, string>
): PurchaseOrder {
  const statuses: PurchaseOrder["status"][] = [
    "draft",
    "ordered",
    "partial",
    "received",
    "cancelled",
  ];
  const normalizedStatus = order.status === "sent" ? "ordered" : order.status;
  const status =
    statuses.find((value) => value === normalizedStatus) ?? "draft";
  return {
    id: order.id,
    number: order.poNumber,
    supplierId: order.supplierId,
    supplierName: supplierNames.get(order.supplierId) ?? "",
    status,
    expectedAt: order.expectedDate ?? order.orderDate,
    items: order.items.map((item) => ({
      poItemId: item.id,
      productId: item.variantId,
      variantId: item.variantId,
      name: productNames.get(item.variantId) ?? "",
      quantity: item.qtyOrdered,
      cost: item.unitCost,
      received: item.qtyReceived,
    })),
  };
}

function mapInvoice(
  invoice: TInvoiceDto,
  customerNames: ReadonlyMap<string, string>
): PricedInvoice {
  const paid = invoice.amountPaid;
  const due = Math.max(0, invoice.totalAmount - paid);
  return {
    id: invoice.id,
    number: invoice.invoiceNumber,
    customerId: invoice.customerId,
    customerName:
      invoice.customerName ?? customerNames.get(invoice.customerId) ?? "",
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    items: (invoice.items ?? []).map((item) => ({
      name: item.itemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
    })),
    taxRate:
      invoice.subtotal > 0 ? (invoice.taxAmount / invoice.subtotal) * 100 : 0,
    notes: invoice.notes ?? "",
    payments: (invoice.payments ?? []).map((payment) => ({
      id: payment.id,
      date: payment.paymentDate,
      amount: payment.amount,
      method: payment.method === "cash" ? "cash" : "bank",
      reference: payment.reference ?? "",
    })),
    isVoid: invoice.status === "void",
    subtotal: invoice.subtotal,
    tax: invoice.taxAmount,
    total: invoice.totalAmount,
    paid,
    due,
    status:
      invoice.status === "void"
        ? "void"
        : due === 0
          ? "paid"
          : paid > 0
            ? "partial"
            : "unpaid",
    isOverdue:
      due > 0 && invoice.dueDate < new Date().toISOString().slice(0, 10),
  };
}

function mapBoarding(
  boarding: TBoardingDto,
  branchNames: ReadonlyMap<string, string>,
  roomNames: ReadonlyMap<string, string>
): Boarding {
  const status: Boarding["status"] =
    boarding.status === "completed"
      ? "checked_out"
      : boarding.status === "active"
        ? "checked_in"
        : boarding.status === "cancelled"
          ? "cancelled"
          : "booked";
  return {
    id: boarding.id,
    code: boarding.id,
    customerId: boarding.customerId ?? "",
    customerName: boarding.ownerName,
    petName: boarding.pets[0]?.name ?? "",
    roomId: boarding.roomId ?? "",
    roomName: boarding.roomId
      ? (roomNames.get(boarding.roomId) ?? boarding.roomId)
      : "",
    branch: branchNames.get(boarding.branchId) ?? boarding.branchId,
    checkIn: boarding.checkInDate,
    checkOut: boarding.estimatedCheckOutDate ?? boarding.checkInDate,
    status,
    ratePerNight: boarding.dailyRate,
  };
}

function mapGrooming(
  appointment: TGroomingAppointmentDto,
  customerNames: ReadonlyMap<string, string>,
  petNames: ReadonlyMap<string, string>,
  staffNames: ReadonlyMap<string, string>,
  branchNames: ReadonlyMap<string, string>
): Grooming {
  const status: Grooming["status"] =
    appointment.status === "in_progress"
      ? "in_progress"
      : appointment.status === "completed"
        ? "done"
        : appointment.status === "cancelled"
          ? "cancelled"
          : "booked";
  return {
    id: appointment.id,
    customerId: appointment.customerId ?? "",
    customerName: appointment.customerId
      ? (customerNames.get(appointment.customerId) ?? appointment.customerId)
      : "Walk-in customer",
    petName: petNames.get(appointment.petId) ?? appointment.petId,
    service: appointment.serviceId,
    groomerId: appointment.groomerId ?? "",
    groomerName: appointment.groomerId
      ? (staffNames.get(appointment.groomerId) ?? appointment.groomerId)
      : "Unassigned",
    branch: appointment.branchId
      ? (branchNames.get(appointment.branchId) ?? appointment.branchId)
      : "",
    scheduledAt: appointment.scheduledAt,
    status,
    price: appointment.price,
  };
}

function mapDocumentTemplate(template: TDocumentTemplateDto): DocumentTemplate {
  const content = template.content;
  return {
    type: template.type === "agreement" ? "agreement" : "receipt",
    title: content.title ?? template.name,
    header: content.header ?? "",
    footer: content.footer ?? "",
    showLogo: content.showLogo ?? false,
    showStaff: content.showStaff ?? false,
    showBranch: content.showBranch ?? false,
    body: content.body ?? content.p1 ?? "",
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

function mapDashboardMetrics(
  metrics: TAccountingDashboardMetricsDto
): Dashboard {
  return {
    revenueToday: metrics.revenueToday,
    ordersToday: metrics.transactionsToday,
    activeBoardings: metrics.activeBoardings,
    arrivalsToday: 0,
    occupancyRate: 0,
    capacity: 0,
    occupied: 0,
    lowStock: metrics.lowStockProducts,
    unpaidOrders: 0,
  };
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
        orderDtos,
        supplierDtos,
        warehouseDtos,
        inventorySnapshot,
        purchaseOrderDtos,
        branches,
        staffDtos,
        groomingAppointments,
        accounts,
        journal,
        expenses,
        shifts,
        commissions,
        loyalty,
        whatsappTemplates,
        whatsappMessages,
        billing,
        invoices,
        portalAdmin,
        advances,
        documentTemplates,
        returns,
        audit,
        insights,
        topSellers,
        onShift,
        cashFlow,
        loyaltyConfig,
        branchHolidayDtos,
        staffInvites,
      ] = await Promise.all([
        petsoClient.admin.accountingDashboardMetrics(),
        petsoClient.admin.products(),
        petsoClient.admin.customers(),
        petsoClient.admin.pets(),
        petsoClient.admin.boardings(),
        petsoClient.admin.rooms(),
        petsoClient.admin.orders(),
        petsoClient.admin.suppliers(),
        petsoClient.admin.warehouses(),
        petsoClient.admin.inventory(),
        petsoClient.admin.purchaseOrders(),
        petsoClient.branches.list(),
        petsoClient.admin.staff(),
        petsoClient.admin.groomingAppointments(),
        petsoClient.admin.accounts(),
        petsoClient.admin.journal(),
        petsoClient.admin.expenses(),
        petsoClient.admin.shifts(),
        petsoClient.admin.commissions(),
        petsoClient.admin.loyaltyMovements(),
        petsoClient.admin.whatsappTemplates(),
        client.post("/whatsapp.messages"),
        petsoClient.admin.billingSummary(),
        petsoClient.admin.invoices(),
        petsoClient.admin.portal(),
        petsoClient.admin.advances(),
        petsoClient.admin.documentTemplates(),
        petsoClient.admin.returns(),
        petsoClient.admin.audit(),
        client.post("/insights.list"),
        petsoClient.admin.topSellers(),
        petsoClient.admin.onShift(),
        petsoClient.admin.cashFlow(),
        petsoClient.admin.loyaltyConfig(),
        petsoClient.admin.branchHolidays(),
        client.post("/staff.invites"),
      ]);
      const productNames = new Map<string, string>();
      for (const product of productDtos) {
        for (const variant of product.variants) {
          productNames.set(variant.id, product.name);
        }
      }
      const branchNames = new Map<string, string>();
      for (const branch of branches) {
        branchNames.set(branch.id, branch.name);
      }
      const customerNames = new Map<string, string>();
      for (const customer of customerDtos) {
        customerNames.set(customer.id, customer.fullName);
      }
      const supplierNames = new Map<string, string>();
      for (const supplier of supplierDtos) {
        supplierNames.set(supplier.id, supplier.name);
      }
      const petNames = new Map<string, string>();
      for (const pet of petDtos) {
        petNames.set(pet.id, pet.name);
      }
      const staffNames = new Map<string, string>();
      for (const staffMember of staffDtos) {
        staffNames.set(staffMember.userId, staffMember.fullName);
      }
      const journalTotals = new Map<
        string,
        { debit: number; credit: number }
      >();
      for (const entry of journal) {
        for (const line of entry.lines) {
          const totals = journalTotals.get(line.accountId) ?? {
            debit: 0,
            credit: 0,
          };
          totals.debit += line.debit;
          totals.credit += line.credit;
          journalTotals.set(line.accountId, totals);
        }
      }
      const trialBalanceRows = accounts.map((account) => {
        const totals = journalTotals.get(account.id) ?? { debit: 0, credit: 0 };
        return {
          id: account.id,
          code: account.code,
          name: account.name,
          type: account.type === "revenue" ? "income" : account.type,
          debit: totals.debit,
          credit: totals.credit,
          balance: totals.debit - totals.credit,
        };
      });
      const trendTotals = new Map<
        string,
        { revenue: number; orders: number }
      >();
      for (const order of orderDtos) {
        if (order.status === "void" || order.status === "cancelled") {
          continue;
        }
        const date = order.createdAt.slice(0, 10);
        const totals = trendTotals.get(date) ?? { revenue: 0, orders: 0 };
        totals.revenue += order.totalAmount;
        totals.orders += 1;
        trendTotals.set(date, totals);
      }
      const trendRows = Array.from({ length: 14 }, (_, index) => {
        const day = new Date();
        day.setDate(day.getDate() - (13 - index));
        const date = day.toISOString().slice(0, 10);
        const totals = trendTotals.get(date) ?? { revenue: 0, orders: 0 };
        return { date, ...totals };
      });
      const calendarRows = rooms.map((room) => ({
        roomId: room.id,
        roomName: room.name,
        branch: branchNames.get(room.branchId ?? "") ?? room.branchId ?? "",
        capacity: room.capacity,
        days: Array.from({ length: 14 }, (_, index) => {
          const day = new Date();
          day.setDate(day.getDate() + index);
          const date = day.toISOString().slice(0, 10);
          const guests = boardings.filter((boarding) => {
            const checkIn = boarding.checkInDate.slice(0, 10);
            const checkOut =
              boarding.estimatedCheckOutDate?.slice(0, 10) ?? checkIn;
            return (
              boarding.roomId === room.id &&
              boarding.status !== "cancelled" &&
              boarding.status !== "completed" &&
              checkIn <= date &&
              checkOut >= date
            );
          });
          return {
            date: day.toISOString(),
            occupied: guests.length,
            isFull: guests.length >= room.capacity,
            isClosed: branchHolidayDtos.some(
              (holiday) =>
                holiday.branchId === room.branchId && holiday.date === date
            ),
            guests: guests.map((guest) => ({
              boardingId: guest.id,
              petName: guest.pets[0]?.name ?? "",
              customerName: guest.ownerName,
            })),
          };
        }),
      }));
      const groomingRows = staffDtos
        .filter((staffMember) => staffMember.role === "groomer")
        .map((groomer) => {
          const branch = groomer.branches[0];
          return {
            groomerId: groomer.userId,
            groomerName: groomer.fullName,
            branch: branch?.name ?? "",
            days: Array.from({ length: 14 }, (_, index) => {
              const day = new Date();
              day.setDate(day.getDate() + index);
              const date = day.toDateString();
              return {
                date: day.toISOString(),
                isClosed: branchHolidayDtos.some(
                  (holiday) =>
                    holiday.branchId === branch?.id &&
                    holiday.date === day.toISOString().slice(0, 10)
                ),
                appointments: groomingAppointments
                  .map((appointment) =>
                    mapGrooming(
                      appointment,
                      customerNames,
                      petNames,
                      staffNames,
                      branchNames
                    )
                  )
                  .filter(
                    (appointment) =>
                      appointment.groomerId === groomer.userId &&
                      appointment.status !== "cancelled" &&
                      new Date(appointment.scheduledAt).toDateString() === date
                  )
                  .map((appointment) => ({
                    id: appointment.id,
                    petName: appointment.petName,
                    customerName: appointment.customerName,
                    service: appointment.service,
                    status: appointment.status,
                    price: appointment.price,
                  })),
              };
            }),
          };
        });
      const onboardingRows = [
        {
          id: "branches",
          title: "Add where you trade from",
          done: branches.length > 0,
          path: "/branches",
        },
        {
          id: "rooms",
          title: "Add the rooms you board in",
          done: rooms.length > 0,
          path: "/branches",
        },
        {
          id: "staff",
          title: "Add the people who work here",
          done: staffDtos.length > 0,
          path: "/staff",
        },
        {
          id: "products",
          title: "Put something in the catalogue",
          done: productDtos.length > 0,
          path: "/products",
        },
      ];
      set({
        dashboard: mapDashboardMetrics(dashboard),
        products: productDtos.map(mapProduct),
        customers: customerDtos.map((customer) =>
          mapCustomer(customer, petDtos)
        ),
        boardings: boardings.map((boarding) =>
          mapBoarding(
            boarding,
            branchNames,
            new Map(rooms.map((room) => [room.id, room.name]))
          )
        ),
        rooms: rooms.map((room) => mapRoom(room, branchNames)),
        orders: orderDtos.map(mapOrder),
        suppliers: supplierDtos.map(mapSupplier),
        warehouses: warehouseDtos.map((warehouse) =>
          mapWarehouse(warehouse, branchNames)
        ),
        batches: inventorySnapshot.batches.map((batch) =>
          mapInventoryBatch(batch, productNames)
        ),
        movements: inventorySnapshot.movements.map((movement) =>
          mapInventoryMovement(movement, productNames)
        ),
        purchaseOrders: purchaseOrderDtos.map((order) =>
          mapPurchaseOrder(order, productNames, supplierNames)
        ),
        branches: branches.map(mapBranch),
        staff: staffDtos.map(mapStaff),
        accounts: accounts.map((account: TAccountDto) => ({
          id: account.id,
          code: account.code,
          name: account.name,
          type: account.type === "revenue" ? "income" : account.type,
        })),
        journal: journal.map((entry: TJournalEntryDto) => ({
          id: entry.id,
          date: entry.entryDate,
          reference: entry.referenceType ?? entry.entryNumber,
          memo: entry.description ?? "",
          lines: entry.lines.map((line) => ({
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
          })),
        })),
        expenses: expenses.map((expense: TExpenseDto) => ({
          id: expense.id,
          date: expense.expenseDate,
          category: expense.category,
          description: expense.description,
          amount: expense.amount,
          paidFrom: expense.paymentMethod,
        })),
        shifts: shifts.map((shift) => ({
          id: shift.id,
          staffId: shift.staffId,
          staffName: shift.staffName,
          date: shift.date,
          clockIn: shift.clockIn ?? "",
          clockOut: shift.clockOut,
        })),
        trialBalance: trialBalanceRows,
        commissions: commissions.map((row: TCommissionReportDto) => ({
          id: `${row.staffId}-${row.date}-${row.service}`,
          name: row.staffName,
          branch: "",
          role: "",
          rate: 0,
          base: row.amount,
          amount: row.amount,
        })),
        grooming: groomingAppointments.map((appointment) =>
          mapGrooming(
            appointment,
            customerNames,
            petNames,
            staffNames,
            branchNames
          )
        ),
        loyalty,
        whatsappTemplates,
        whatsappMessages: whatsappMessages.data,
        subscription: billing.subscription
          ? {
              plan: billing.subscription.plan as Subscription["plan"],
              price: 0,
              interval: "month",
              renewsAt: billing.subscription.currentPeriodEnd ?? "",
              status:
                billing.subscription.status === "past_due"
                  ? "past_due"
                  : "active",
              limits: { staff: 0, branches: 0, boardingsPerMonth: 0 },
            }
          : undefined,
        billingInvoices: billing.invoices,
        usage: billing.usage,
        invoices: invoices.map((invoice) => mapInvoice(invoice, customerNames)),
        portalStats: {
          reviews: portalAdmin.stats.totalReviews,
          averageRating: portalAdmin.stats.averageRating,
          activeServices: portalAdmin.services.filter(
            (service) => service.isActive
          ).length,
          totalServices: portalAdmin.stats.totalServices,
          pets: portalAdmin.stats.totalPets,
          portalBookings: 0,
          enabled: portalAdmin.config.isActive,
          slug: portalAdmin.config.slug,
        },
        portalServices: portalAdmin.services.map((service) => ({
          id: service.id,
          name: service.name,
          description: service.description ?? "",
          category: service.category ?? "",
          durationMinutes: service.durationMinutes,
          price: service.price,
          isActive: service.isActive,
        })),
        portalReviews: portalAdmin.reviews.map((review) => ({
          id: review.id,
          customerName: review.customerName,
          rating: review.rating,
          body: review.content,
          createdAt: review.createdAt,
        })),
        advances: advances.map((advance) => ({
          id: advance.id,
          staffId: advance.staffId,
          staffName: staffNames.get(advance.staffId) ?? advance.staffId,
          amount: advance.amount,
          installment: advance.installmentAmount,
          notes: advance.notes ?? "",
          createdAt: advance.createdAt,
          payments: [],
          repaid: advance.amount - advance.remaining,
          remaining: advance.remaining,
          status: advance.status,
        })),
        noteTemplates: documentTemplates.map(mapDocumentTemplate),
        returns: returns.map((item) => ({
          id: item.id,
          orderId: item.orderId,
          orderNumber: item.orderId,
          customerName: "",
          createdAt: item.createdAt,
          reason: item.reason ?? "",
          refundMethod: item.refundMethod === "cash" ? "cash" : "bank",
          refundAmount: item.refundAmount,
          items: item.items.map((returnItem) => ({
            productId: returnItem.orderItemId,
            name: returnItem.orderItemId,
            quantity: returnItem.qty,
            isDamaged: returnItem.isDamaged,
          })),
        })),
        audit: audit.map((entry) => ({
          id: entry.id,
          at: entry.createdAt,
          action: entry.action,
          actor: entry.userId,
          role: entry.entityType,
          summary: entry.entityId ?? entry.action,
        })),
        insights: insights.data,
        trend: trendRows,
        topSellers: topSellers.map((item) => ({
          name: item.name,
          units: item.salesCount,
          revenue: item.revenue,
        })),
        onShift: onShift.map((entry) => ({
          staffId: entry.staffId,
          staffName: entry.staffName,
          since: entry.since,
        })),
        cashFlow: [
          ...cashFlow.inflows.map((row) => ({
            accountId: row.category,
            name: row.category,
            opening: 0,
            received: row.amount,
            paid: 0,
            closing: row.amount,
          })),
          ...cashFlow.outflows.map((row) => ({
            accountId: row.category,
            name: row.category,
            opening: 0,
            received: 0,
            paid: row.amount,
            closing: -row.amount,
          })),
        ],
        loyaltyConfig: {
          rupiahPerPoint: loyaltyConfig.pointsPerRupiah
            ? 1 / loyaltyConfig.pointsPerRupiah
            : 0,
          tiers: loyaltyConfig.tiers.map((tier) => ({
            name: tier.name,
            from: tier.minPoints,
          })),
        },
        branchHolidays: branchHolidayDtos.map((holiday: TBranchHolidayDto) => ({
          id: holiday.id,
          branch: branchNames.get(holiday.branchId) ?? holiday.branchId,
          date: holiday.date,
          reason: holiday.name,
        })),
        calendar: calendarRows,
        onboarding: onboardingRows,
        staffInvites: staffInvites.data,
        groomingCalendar: groomingRows,
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
    if (status === "cancelled") {
      return;
    }
    const backendStatus =
      status === "checked_out"
        ? "completed"
        : status === "checked_in"
          ? "active"
          : status === "booked"
            ? "draft"
            : status;
    await petsoClient.admin.updateBoardingStatus(id, backendStatus);
    await get().fetchAll();
  },
  createInvoice: async (invoice) => {
    const customer = get().customers.find(
      (entry) => entry.name === invoice.customerName
    );
    if (!customer) {
      return { created: false };
    }
    const subtotal = invoice.items.reduce(
      (total, item) => total + item.quantity * item.unitPrice - item.discount,
      0
    );
    const response = await petsoClient.admin.createInvoice({
      customerId: customer.id,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: invoice.dueDate,
      subtotal,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: subtotal,
      notes: invoice.notes,
      items: invoice.items.map((item) => ({
        itemName: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: item.quantity * item.unitPrice - item.discount,
      })),
    });
    await get().fetchAll();
    return {
      created: true,
      invoice: mapInvoice(response, new Map([[customer.id, customer.name]])),
    };
  },
  recordInvoicePayment: async (id, amount, method, reference) => {
    const response = await petsoClient.admin.recordInvoicePayment({
      invoiceId: id,
      amount,
      paymentDate: new Date().toISOString(),
      method: method === "cash" ? "cash" : "transfer",
      reference,
    });
    await get().fetchAll();
    return {
      recorded: true,
      due: Math.max(0, response.totalAmount - response.amountPaid),
    };
  },
  voidInvoice: async (id) => {
    const response = await petsoClient.admin.voidInvoice(id);
    if (response.voided) {
      await get().fetchAll();
    }
    return response;
  },
  createPortalService: async (service) => {
    await petsoClient.admin.createPortalService({
      name: service.name,
      description: service.description,
      category:
        service.category.toLowerCase() === "saltwater"
          ? "saltwater"
          : service.category.toLowerCase() === "terrarium"
            ? "terrarium"
            : service.category.toLowerCase() === "freshwater"
              ? "freshwater"
              : "other",
      durationMinutes: service.durationMinutes,
      price: service.price,
    });
    await get().fetchAll();
    return true;
  },
  setPortalServiceActive: async (id, isActive) => {
    await petsoClient.admin.setPortalServiceActive(id, isActive);
    await get().fetchAll();
  },
  deletePortalService: async (id) => {
    await petsoClient.admin.deletePortalService(id);
    await get().fetchAll();
  },
  savePortalSettings: async (settings) => {
    await petsoClient.admin.updatePortalSettings({
      ...(settings.slug ? { slug: settings.slug } : {}),
      ...(settings.portalEnabled !== undefined
        ? { isActive: settings.portalEnabled }
        : {}),
    });
    await get().fetchAll();
    return { saved: true };
  },
  createBoarding: async (boarding) => {
    const customer = get().customers.find(
      (entry) => entry.name === boarding.customerName
    );
    const pet = customer?.pets.find((entry) => entry.name === boarding.petName);
    const branchId = get().branches[0]?.id;
    if (!customer || !pet || !branchId) {
      return { created: false, reason: "Customer, pet, or branch not found" };
    }
    const species = pet.species.toLowerCase();
    const kind =
      species === "cat" || species === "dog" || species === "rabbit"
        ? species
        : "other";
    await petsoClient.admin.createBoarding({
      branchId,
      customerId: customer.id,
      ownerName: customer.name,
      ownerAddress: "Not provided",
      ownerPhone: customer.phone || "Not provided",
      checkInDate: boarding.checkIn,
      estimatedCheckOutDate: boarding.checkOut,
      roomId: boarding.roomId,
      dailyRate: 0,
      status: "active",
      pets: [
        {
          name: pet.name,
          kind,
          breed: pet.breed || "Unknown",
          vaccinated: "no",
          weight: null,
          healthStatus: "Normal",
          initialCondition: null,
          notes: null,
        },
      ],
    });
    await get().fetchAll();
    return { created: true };
  },
  adjustStock: async (id, delta) => {
    const product = get().products.find((item) => item.id === id);
    const variantId = product?.variants?.[0]?.id;
    if (!variantId) {
      return;
    }
    await petsoClient.admin.adjustStock({
      variantId,
      quantity: delta,
      notes: "Manual stock adjustment",
    });
    await get().fetchAll();
  },
  createOrder: async (items, _customerName) => {
    const branchId = get().branches[0]?.id ?? "";
    const order = await petsoClient.admin.createOrder({
      branchId,
      customerId: null,
      status: "completed",
      items: items.map((item) => {
        const product = get().products.find(
          (entry) => entry.id === item.productId
        );
        return {
          productId: item.productId,
          variantId: item.variantId ?? product?.variants?.[0]?.id ?? null,
          quantity: item.quantity,
          priceAtTime: item.price,
        };
      }),
      payments: [
        {
          method: "cash",
          amount: items.reduce(
            (total, item) => total + item.price * item.quantity,
            0
          ),
        },
      ],
    });
    await get().fetchAll();
    return mapOrder(order);
  },
  markOrderPaid: async (id) => {
    await client.post("/orders.markPaid", { id });
    await get().fetchAll();
  },
  voidOrder: async (id) => {
    const response = await petsoClient.admin.voidOrder(id, "Voided from POS");
    if (response.voided) {
      await get().fetchAll();
    }
    return response;
  },
  receivePurchaseOrder: async (id, quantities) => {
    const purchaseOrder = get().purchaseOrders.find((order) => order.id === id);
    if (!purchaseOrder) {
      return { received: false, reason: "Purchase order not found" };
    }

    const response = await petsoClient.admin.receivePurchaseOrder({
      poId: id,
      items: purchaseOrder.items
        .map((item) => ({
          poItemId: item.poItemId ?? item.variantId ?? item.productId,
          qtyReceived: Math.max(
            0,
            quantities?.[item.productId] ?? item.quantity - item.received
          ),
          expiryDate: null,
          batchNumber: null,
        }))
        .filter((item) => item.qtyReceived > 0),
    });
    await get().fetchAll();
    return { received: true, result: response };
  },
  createPurchaseOrder: async (order) => {
    const branchId = get().branches[0]?.id ?? null;
    const response = await petsoClient.admin.createPurchaseOrder({
      branchId,
      supplierId: order.supplierId,
      expectedDate: order.expectedAt,
      items: order.items.map((item) => ({
        variantId:
          item.variantId ??
          get().products.find((product) => product.id === item.productId)
            ?.variants?.[0]?.id ??
          item.productId,
        qtyOrdered: item.quantity,
        unitCost: item.cost,
      })),
    });
    await get().fetchAll();
    return {
      created: true,
      order: mapPurchaseOrder(response, new Map(), new Map()),
    };
  },
  saveNoteTemplate: async (template) => {
    const title = template.title?.trim() ?? "";
    if (!title) {
      return { saved: false, reason: "Template title is required" };
    }
    const existingTemplates = await petsoClient.admin.documentTemplates();
    const existing = existingTemplates.find(
      (item) => item.type === template.type
    );
    await petsoClient.admin.saveDocumentTemplate({
      ...(existing ? { id: existing.id } : {}),
      type: template.type,
      name: title,
      content: {
        title,
        header: template.header ?? "",
        body: template.body ?? "",
        footer: template.footer ?? "",
        showLogo: template.showLogo ?? false,
        showStaff: template.showStaff ?? false,
        showBranch: template.showBranch ?? false,
      },
    });
    await get().fetchAll();
    return { saved: true };
  },
  createReturn: async (input) => {
    const order = get().orders.find((entry) => entry.id === input.orderId);
    if (!order) {
      return { created: false, reason: "Order not found" };
    }
    const items = input.items.map((item) => {
      const orderItem = order.items.find(
        (entry) =>
          entry.productId === item.productId &&
          (!item.variantId || entry.variantId === item.variantId)
      );
      return {
        orderItemId: orderItem?.orderItemId ?? item.productId,
        qty: item.quantity,
        reason: input.reason,
        isDamaged: item.isDamaged,
      };
    });
    const refundAmount = items.reduce((total, item) => {
      const orderItem = order.items.find(
        (entry) => entry.orderItemId === item.orderItemId
      );
      return total + (orderItem?.price ?? 0) * item.qty;
    }, 0);
    await petsoClient.admin.createReturn({
      orderId: input.orderId,
      refundMethod: input.refundMethod,
      refundAmount,
      reason: input.reason,
      items,
    });
    await get().fetchAll();
    return { created: true, refundable: refundAmount };
  },
  saveProduct: async (product) => {
    const input = {
      ...(product.id ? { id: product.id } : {}),
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: product.price,
      stock: product.stock ?? 0,
      reorderLevel: product.reorderLevel ?? 0,
    };
    if (product.id) {
      await petsoClient.admin.updateProduct(input);
    } else {
      await petsoClient.admin.createProduct(input);
    }
    await get().fetchAll();
    return { saved: true };
  },
  deleteProduct: async (id) => {
    await petsoClient.admin.deleteProduct(id);
    await get().fetchAll();
    return { removed: true };
  },
  saveCustomer: async (customer) => {
    const savedCustomer = customer.id
      ? await petsoClient.admin.updateCustomer({
          id: customer.id,
          fullName: customer.name,
          phone: customer.phone ?? "",
          email: customer.email ?? null,
        })
      : await petsoClient.admin.createCustomer({
          fullName: customer.name,
          phone: customer.phone ?? "",
          email: customer.email ?? null,
        });
    if (!customer.id && customer.pets) {
      for (const pet of customer.pets) {
        const species = pet.species.toLowerCase();
        await petsoClient.admin.createPet({
          customerId: savedCustomer.id,
          name: pet.name,
          species: ["dog", "cat", "rabbit", "bird", "hamster"].includes(species)
            ? species
            : "other",
          breed: pet.breed || null,
          gender: null,
          birthDate: null,
          weightKg: null,
          color: null,
          isVaccinated: false,
          vaccineNotes: null,
          allergies: null,
          medicalNotes: null,
          specialInstructions: null,
          photoUrl: null,
        });
      }
    }
    await get().fetchAll();
    return { saved: true };
  },
  deleteCustomer: async (id) => {
    await petsoClient.admin.deleteCustomer(id);
    await get().fetchAll();
    return { removed: true };
  },
  saveStaff: async (member) => write("/staff.save", member, get),
  deleteStaff: async (id) => {
    const branchId = get().branches[0]?.id;
    if (!branchId) {
      return { removed: false, reason: "No branch is available" };
    }
    await petsoClient.admin.removeStaff(id, branchId);
    await get().fetchAll();
    return { removed: true };
  },
  saveSupplier: async (supplier) => {
    const input = {
      ...(supplier.id ? { id: supplier.id } : {}),
      name: supplier.name,
      contactPerson: supplier.contact ?? null,
      phone: supplier.phone ?? null,
      email: null,
      address: null,
      notes: supplier.terms ?? null,
    };
    if (supplier.id) {
      await petsoClient.admin.updateSupplier(input);
    } else {
      await petsoClient.admin.createSupplier(input);
    }
    await get().fetchAll();
    return { saved: true };
  },
  deleteSupplier: async (id) => {
    await petsoClient.admin.deleteSupplier(id);
    await get().fetchAll();
    return { removed: true };
  },
  saveWarehouse: async (warehouse) => {
    const branchId =
      get().branches.find((branch) => branch.name === warehouse.branch)?.id ??
      warehouse.branch;
    const input = {
      ...(warehouse.id ? { id: warehouse.id } : {}),
      branchId,
      name: warehouse.name,
      code: null,
      address: null,
    };
    if (warehouse.id) {
      await petsoClient.admin.updateWarehouse(input);
    } else {
      await petsoClient.admin.createWarehouse(input);
    }
    await get().fetchAll();
    return { saved: true };
  },
  deleteWarehouse: async (id) => {
    await petsoClient.admin.deleteWarehouse(id);
    await get().fetchAll();
    return { removed: true };
  },
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
  addHoliday: async (holiday) => {
    const branchId = get().branches.find(
      (branch) => branch.name === holiday.branch
    )?.id;
    if (!branchId || !holiday.date || !holiday.reason) {
      return { saved: false, reason: "Branch, date, and reason are required" };
    }
    await petsoClient.admin.createBranchHoliday({
      branchId,
      name: holiday.reason,
      date: holiday.date,
    });
    await get().fetchAll();
    return { saved: true };
  },
  removeHoliday: async (id) => {
    await petsoClient.admin.deleteBranchHoliday(id);
    await get().fetchAll();
  },
  saveBranch: async (branch) => {
    const input = {
      ...(branch.id ? { id: branch.id } : {}),
      name: branch.name,
      address: branch.address ?? null,
      phone: branch.phone ?? null,
      email: null,
      whatsappNumber: null,
      streetAddress: null,
      addressLocality: null,
      addressRegion: null,
      postalCode: null,
      addressCountry: null,
      latitude: null,
      longitude: null,
      operatingHours: null,
    };
    if (branch.id) {
      await petsoClient.branches.update(input);
    } else {
      await petsoClient.branches.create(input);
    }
    await get().fetchAll();
    return { saved: true };
  },
  deleteBranch: async (id) => {
    await petsoClient.branches.remove(id);
    await get().fetchAll();
    return { removed: true };
  },
  saveLoyaltyConfig: async (config) => {
    const current = get().loyaltyConfig;
    await petsoClient.admin.updateLoyaltyConfig({
      pointsPerRupiah:
        config.rupiahPerPoint && config.rupiahPerPoint > 0
          ? 1 / config.rupiahPerPoint
          : 0.01,
      pointsExpiryDays: 365,
      minRedeemPoints: 100,
      isActive: current ? true : true,
    });
    await get().fetchAll();
    return { saved: true };
  },
  clockIn: async (staffId) => {
    await petsoClient.admin.clockIn({
      staffId,
      date: new Date().toISOString().slice(0, 10),
      notes: null,
    });
    await get().fetchAll();
    return { ok: true };
  },
  clockOut: async (staffId) => {
    await petsoClient.admin.clockOut({
      staffId,
      date: new Date().toISOString().slice(0, 10),
      notes: null,
    });
    await get().fetchAll();
    return { ok: true };
  },
  createAdvance: async (advance) => {
    const response = await petsoClient.admin.createAdvance({
      staffId: advance.staffId,
      amount: advance.amount,
      installmentAmount: advance.installment,
      notes: advance.notes || null,
    });
    if (response.created) {
      await get().fetchAll();
    }
    return response.created;
  },
  repayAdvance: async (id, amount, source) => {
    const response = await petsoClient.admin.repayAdvance({
      kasbonId: id,
      amount,
      source: source === "commission" ? "commission_deduction" : "manual",
    });
    if (response.repaid) {
      await get().fetchAll();
    }
    return { repaid: response.repaid };
  },
  setStaffStatus: async (id, status) => {
    await client.post("/staff.setStatus", { id, status });
    await get().fetchAll();
  },
  createRoom: async (room) => {
    const branchId =
      get().branches.find((branch) => branch.name === room.branch)?.id ??
      room.branch;
    await petsoClient.admin.createRoom({
      branchId,
      name: room.name,
      roomType: room.type,
      capacity: room.capacity,
      dailyRate: 0,
      description: null,
    });
    await get().fetchAll();
  },
  updateRoom: async (id, changes) => {
    await petsoClient.admin.updateRoom({
      id,
      ...(changes.name ? { name: changes.name } : {}),
      ...(changes.capacity ? { capacity: changes.capacity } : {}),
      ...(changes.type ? { roomType: changes.type } : {}),
    });
    await get().fetchAll();
  },
  deleteRoom: async (id) => {
    const response = await petsoClient.admin.deleteRoom(id);
    await get().fetchAll();
    return response.deleted;
  },
  createExpense: async (expense) => {
    await petsoClient.admin.createExpense({
      branchId: get().branches[0]?.id ?? null,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      expenseDate: new Date().toISOString(),
      paymentMethod: expense.paidFrom,
      receiptUrl: null,
      notes: null,
    });
    await get().fetchAll();
  },
  setGroomingStatus: async (id, status) => {
    const backendStatus =
      status === "in_progress"
        ? "in_progress"
        : status === "done"
          ? "completed"
          : status === "cancelled"
            ? "cancelled"
            : "confirmed";
    await petsoClient.admin.updateGroomingStatus(id, backendStatus);
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
    const response = await petsoClient.admin.redeemLoyaltyPoints({
      customerId,
      points,
    });
    await get().fetchAll();
    return response.pointsRedeemed > 0;
  },
}));
