import { canAccessRoute } from "./access";
import { mockDb } from "./db";

/**
 * Seed data and request handlers for the shop domains.
 *
 * Mirrors the feature surface of the reference pet-store-app so the scenes can
 * be built against the same shapes, served from the existing in-browser mock
 * rather than a backend.
 */

/** One size or flavour of a product, with its own code, price and stock. */
export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  reorderLevel: number;
  supplier: string;
  status: "active" | "archived";
  /** Absent when the product is sold as one thing rather than in sizes. */
  variants?: ProductVariant[];
}

/**
 * A pet on a customer's record.
 *
 * A type alias rather than an interface: these travel through the client as
 * JSON, and an interface has no implicit index signature to satisfy that.
 */
export type Pet = {
  id: string;
  name: string;
  species: string;
  breed: string;
};

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  pets: Pet[];
  loyaltyPoints: number;
  joinedAt: string;
}

export interface Boarding {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  petName: string;
  roomId: string;
  roomName: string;
  branch: string;
  checkIn: string;
  checkOut: string;
  status: "booked" | "checked_in" | "checked_out" | "cancelled";
  ratePerNight: number;
}

export interface Room {
  id: string;
  name: string;
  branch: string;
  capacity: number;
  type: "standard" | "deluxe" | "suite";
}

export interface Order {
  id: string;
  number: string;
  customerName: string;
  channel: "pos" | "online";
  /** Who rang it up, when someone was signed in. */
  soldById?: string | null;
  total: number;
  paidAt: string | null;
  status: "draft" | "paid" | "refunded" | "void";
  items: {
    productId: string;
    /** Set when the line was a particular size of the product. */
    variantId?: string;
    name: string;
    quantity: number;
    price: number;
  }[];
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  terms: string;
}

export interface Warehouse {
  id: string;
  name: string;
  branch: string;
}

export interface Batch {
  id: string;
  productId: string;
  productName: string;
  warehouseId: string;
  lot: string;
  quantity: number;
  expiresAt: string;
}

export interface Movement {
  id: string;
  productId: string;
  productName: string;
  warehouseId: string;
  type: "in" | "out" | "transfer" | "adjustment";
  quantity: number;
  reference: string;
  createdAt: string;
}

export interface PurchaseOrderItem {
  productId: string;
  /** Set when a particular size was ordered. */
  variantId?: string;
  name: string;
  quantity: number;
  cost: number;
  /** How many of the ordered quantity have actually arrived. */
  received: number;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  status: "draft" | "ordered" | "partial" | "received" | "cancelled";
  expectedAt: string;
  items: PurchaseOrderItem[];
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  manager: string;
}

/** Someone asked to join, who has not started yet. */
export interface StaffInvite {
  id: string;
  email: string;
  name: string;
  role: string;
  branch: string;
  status: "pending" | "accepted";
  sentAt: string;
}

/** A day a branch is shut. */
export interface BranchHoliday {
  id: string;
  branch: string;
  /** The day itself, as `yyyy-mm-dd`. */
  date: string;
  reason: string;
}

export interface Staff {
  id: string;
  name: string;
  /** The address they sign in with. */
  email: string;
  role: "owner" | "manager" | "groomer" | "cashier" | "caretaker";
  branch: string;
  phone: string;
  status: "active" | "on_leave" | "inactive";
  commissionRate: number;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
}

export interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  reference: string;
  memo: string;
  lines: JournalLine[];
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paidFrom: string;
}

export interface Shift {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
}

export interface Grooming {
  id: string;
  customerId: string;
  customerName: string;
  petName: string;
  service: string;
  groomerId: string;
  groomerName: string;
  branch: string;
  scheduledAt: string;
  status: "booked" | "in_progress" | "done" | "cancelled";
  price: number;
}

export interface LoyaltyMovement {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  points: number;
  reason: string;
}

export interface WhatsappTemplate {
  id: string;
  name: string;
  category: "reminder" | "marketing" | "receipt";
  body: string;
  status: "approved" | "pending";
}

export interface WhatsappMessage {
  id: string;
  templateId: string;
  templateName: string;
  to: string;
  customerName: string;
  sentAt: string;
  status: "sent" | "delivered" | "read" | "failed";
}

export interface Subscription {
  plan: "free" | "pro" | "business";
  price: number;
  interval: "month" | "year";
  renewsAt: string;
  status: "active" | "past_due";
  limits: { staff: number; branches: number; boardingsPerMonth: number };
}

export interface BillingInvoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: "paid" | "open";
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export interface InvoicePayment {
  id: string;
  date: string;
  amount: number;
  method: "cash" | "bank";
  reference: string;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  taxRate: number;
  notes: string;
  payments: InvoicePayment[];
  /** Set when the invoice is cancelled; a void invoice is owed nothing. */
  isVoid: boolean;
}

/** Something worth someone's attention, worked out from the shop's records. */
export interface Insight {
  id: string;
  type: "trend" | "anomaly" | "recommendation" | "alert";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  /** Which part of the shop it concerns. */
  module: string;
  /** The record it was worked out from, so it can be checked. */
  relatedId: string | null;
}

/** How points are earned and what they add up to. */
export interface LoyaltyConfig {
  /** Rupiah a customer spends to earn one point. */
  rupiahPerPoint: number;
  /** Tiers from the highest down; the last must start at nothing. */
  tiers: { name: string; from: number }[];
}

/** A key someone uses to reach the API without signing in. */
export interface ApiKey {
  id: string;
  name: string;
  /** The secret itself; only ever shown once, when it is made. */
  value: string;
  /** Enough to tell one key from another afterwards. */
  last4: string;
  /** Absent when the key is unrestricted; the page treats any value as a restriction. */
  scope?: string[];
  expiresAt: string | null;
  lastActiveAt: string | null;
  userId: string;
  createdAt: string;
}

/** A place to send word when something happens. */
export interface WebhookSubscription {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  events: string[];
  secret: string | null;
  createdAt: string;
}

/** One attempt to tell a subscription about something. */
export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  subscriptionName: string;
  event: string;
  url: string;
  status: "delivered" | "failed";
  statusCode: number;
  at: string;
}

/** One change somebody made, for the audit log. */
export interface AuditEntry {
  id: string;
  at: string;
  /** The endpoint that made the change. */
  action: string;
  /** The address of whoever was signed in, or "unknown". */
  actor: string;
  role: string;
  summary: string;
}

export interface ReturnItem {
  productId: string;
  /** Set when a particular size came back. */
  variantId?: string;
  name: string;
  quantity: number;
  /** Damaged goods are refunded but not put back on the shelf. */
  isDamaged: boolean;
}

/** Goods handed back against an order, and the money given back for them. */
export interface Return {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  createdAt: string;
  reason: string;
  refundMethod: "cash" | "bank";
  refundAmount: number;
  items: ReturnItem[];
}

export interface AdvancePayment {
  id: string;
  date: string;
  amount: number;
  /** Repaid by hand, or taken out of commission owed. */
  source: "manual" | "commission";
}

/** A cash advance to a staff member, repaid in instalments. */
export interface Advance {
  id: string;
  staffId: string;
  staffName: string;
  amount: number;
  installment: number;
  notes: string;
  createdAt: string;
  payments: AdvancePayment[];
}

/** A printable template: the POS receipt, or the boarding agreement. */
export interface DocumentTemplate {
  type: "receipt" | "agreement";
  title: string;
  header: string;
  footer: string;
  showLogo: boolean;
  showStaff: boolean;
  showBranch: boolean;
  body: string;
}

export interface PortalService {
  id: string;
  name: string;
  description: string;
  category: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
}

export interface PortalReview {
  id: string;
  customerName: string;
  rating: number;
  body: string;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  sentAt: string;
}

export interface Business {
  slug: string;
  name: string;
  /** The account that signs in to manage this business. */
  ownerEmail: string;
  ownerName: string;
  tagline: string;
  address: string;
  phone: string;
  hours: string;
  /** Whether the public shopfront answers at all. */
  portalEnabled: boolean;
}

export interface State {
  products: Product[];
  customers: Customer[];
  boardings: Boarding[];
  rooms: Room[];
  orders: Order[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  batches: Batch[];
  movements: Movement[];
  purchaseOrders: PurchaseOrder[];
  branches: Branch[];
  branchHolidays: BranchHoliday[];
  staffInvites: StaffInvite[];
  staff: Staff[];
  accounts: Account[];
  journal: JournalEntry[];
  expenses: Expense[];
  shifts: Shift[];
  grooming: Grooming[];
  loyalty: LoyaltyMovement[];
  whatsappTemplates: WhatsappTemplate[];
  whatsappMessages: WhatsappMessage[];
  subscription: Subscription;
  billingInvoices: BillingInvoice[];
  business: Business;
  contactMessages: ContactMessage[];
  invoices: Invoice[];
  advances: Advance[];
  returns: Return[];
  audit: AuditEntry[];
  loyaltyConfig: LoyaltyConfig;
  apiKeys: ApiKey[];
  webhookSubscriptions: WebhookSubscription[];
  webhookDeliveries: WebhookDelivery[];
  documentTemplates: DocumentTemplate[];
  portalServices: PortalService[];
  portalReviews: PortalReview[];
}

/** Where the signed-in session is remembered. */
const SESSION_KEY = "shop_session";

/**
 * Whether someone is signed in.
 *
 * @returns true when a session exists.
 */
export function hasSession(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return Boolean(localStorage.getItem(SESSION_KEY));
}

/** Where the branch someone is looking at is remembered. */
const BRANCH_KEY = "shop_branch";

/**
 * The branch someone is looking at, or undefined for all of them.
 *
 * A branch that no longer exists is treated as no choice at all: showing
 * nothing would look like the shop had lost its records.
 *
 * @returns the branch name, or undefined.
 */
export function currentBranch(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  const chosen = localStorage.getItem(BRANCH_KEY) ?? undefined;
  if (!chosen) {
    return undefined;
  }
  return state.branches.some((branch) => branch.name === chosen)
    ? chosen
    : undefined;
}

/**
 * Chooses the branch to look at.
 *
 * @param branch the branch name, or undefined for all of them.
 */
export function setCurrentBranch(branch: string | undefined) {
  if (typeof window === "undefined") {
    return;
  }
  if (branch) {
    localStorage.setItem(BRANCH_KEY, branch);
  } else {
    localStorage.removeItem(BRANCH_KEY);
  }
}

/** Where the signed-in role is remembered. */
const SESSION_ROLE_KEY = "shop_session_role";

/**
 * The role of whoever is signed in.
 *
 * @returns the role, or undefined when nobody is signed in.
 */
export function currentRole(): string | undefined {
  if (typeof window === "undefined" || !hasSession()) {
    return undefined;
  }
  return localStorage.getItem(SESSION_ROLE_KEY) ?? undefined;
}

/**
 * Starts or ends the session.
 *
 * @param email the signed-in address, or null to sign out.
 * @param role the role they hold, when signing in.
 */
function setSession(email: string | null, role?: string) {
  if (typeof window === "undefined") {
    return;
  }
  if (email) {
    localStorage.setItem(SESSION_KEY, email);
    localStorage.setItem(SESSION_ROLE_KEY, role ?? "caretaker");
  } else {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_ROLE_KEY);
  }
}

const STORAGE_KEY = "shop_db_v5";

/** Counter that keeps ids apart when several are made in one millisecond. */
let idCounter = 0;

/**
 * A unique id for a new record.
 *
 * `Date.now()` alone repeats inside a millisecond, and two records sharing an
 * id makes every lookup by id ambiguous.
 *
 * @param prefix the record kind, e.g. "prd".
 * @returns an id nothing else holds.
 */
function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString();

const seed: State = {
  products: [
    {
      id: "prd-1",
      sku: "FD-ROY-2KG",
      name: "Royal Canin Adult 2kg",
      category: "Food",
      price: 285000,
      stock: 42,
      reorderLevel: 10,
      supplier: "Anugrah Pet Supply",
      status: "active",
    },
    {
      id: "prd-2",
      sku: "FD-WHK-1KG",
      name: "Whiskas Tuna 1kg",
      category: "Food",
      price: 68000,
      stock: 8,
      reorderLevel: 12,
      supplier: "Anugrah Pet Supply",
      status: "active",
    },
    {
      id: "prd-3",
      sku: "AC-COL-M",
      name: "Leather Collar Medium",
      category: "Accessories",
      price: 125000,
      stock: 23,
      reorderLevel: 5,
      supplier: "Pet Gear Nusantara",
      status: "active",
    },
    {
      id: "prd-4",
      sku: "GR-SHP-500",
      name: "Grooming Shampoo 500ml",
      category: "Grooming",
      price: 92000,
      stock: 3,
      reorderLevel: 8,
      supplier: "Bersih Hewan",
      status: "active",
    },
    {
      id: "prd-5",
      sku: "TY-BAL-S",
      name: "Chew Ball Small",
      category: "Toys",
      price: 45000,
      stock: 60,
      reorderLevel: 15,
      supplier: "Pet Gear Nusantara",
      status: "active",
    },
  ],
  customers: [
    {
      id: "cus-1",
      name: "Sinta Wijaya",
      phone: "+62 812-1111-2222",
      email: "sinta@example.com",
      pets: [
        { id: "pet-1", name: "Milo", species: "Dog", breed: "Shiba Inu" },
        { id: "pet-2", name: "Luna", species: "Cat", breed: "Persian" },
      ],
      loyaltyPoints: 1240,
      joinedAt: daysFromNow(-320),
    },
    {
      id: "cus-2",
      name: "Bayu Pratama",
      phone: "+62 813-3333-4444",
      email: "bayu@example.com",
      pets: [{ id: "pet-3", name: "Bruno", species: "Dog", breed: "Beagle" }],
      loyaltyPoints: 380,
      joinedAt: daysFromNow(-120),
    },
    {
      id: "cus-3",
      name: "Rina Kartika",
      phone: "+62 814-5555-6666",
      email: "rina@example.com",
      pets: [{ id: "pet-4", name: "Coco", species: "Cat", breed: "Munchkin" }],
      loyaltyPoints: 90,
      joinedAt: daysFromNow(-35),
    },
  ],
  rooms: [
    {
      id: "rm-1",
      name: "Kandang A1",
      branch: "Kemang",
      capacity: 2,
      type: "standard",
    },
    {
      id: "rm-2",
      name: "Kandang A2",
      branch: "Kemang",
      capacity: 2,
      type: "standard",
    },
    {
      id: "rm-3",
      name: "Suite B1",
      branch: "Kemang",
      capacity: 1,
      type: "suite",
    },
    {
      id: "rm-4",
      name: "Deluxe C1",
      branch: "Bintaro",
      capacity: 3,
      type: "deluxe",
    },
  ],
  boardings: [
    {
      id: "bd-1",
      code: "BRD-1041",
      customerId: "cus-1",
      customerName: "Sinta Wijaya",
      petName: "Milo",
      roomId: "rm-1",
      roomName: "Kandang A1",
      branch: "Kemang",
      checkIn: daysFromNow(-2),
      checkOut: daysFromNow(3),
      status: "checked_in",
      ratePerNight: 150000,
    },
    {
      id: "bd-2",
      code: "BRD-1042",
      customerId: "cus-2",
      customerName: "Bayu Pratama",
      petName: "Bruno",
      roomId: "rm-3",
      roomName: "Suite B1",
      branch: "Kemang",
      checkIn: daysFromNow(-1),
      checkOut: daysFromNow(1),
      status: "checked_in",
      ratePerNight: 275000,
    },
    {
      id: "bd-3",
      code: "BRD-1043",
      customerId: "cus-3",
      customerName: "Rina Kartika",
      petName: "Coco",
      roomId: "rm-2",
      roomName: "Kandang A2",
      branch: "Kemang",
      checkIn: daysFromNow(1),
      checkOut: daysFromNow(4),
      status: "booked",
      ratePerNight: 150000,
    },
    {
      id: "bd-4",
      code: "BRD-1039",
      customerId: "cus-1",
      customerName: "Sinta Wijaya",
      petName: "Luna",
      roomId: "rm-4",
      roomName: "Deluxe C1",
      branch: "Bintaro",
      checkIn: daysFromNow(-9),
      checkOut: daysFromNow(-4),
      status: "checked_out",
      ratePerNight: 210000,
    },
  ],
  orders: [
    {
      id: "ord-1",
      number: "INV-2041",
      soldById: "stf-1",
      customerName: "Sinta Wijaya",
      channel: "pos",
      // 285.000 + 45.000; an order's total has to be what its lines come to.
      total: 330000,
      paidAt: daysFromNow(-0.2),
      status: "paid",
      items: [
        {
          productId: "prd-1",
          name: "Royal Canin Adult 2kg",
          quantity: 1,
          price: 285000,
        },
        {
          productId: "prd-5",
          name: "Chew Ball Small",
          quantity: 1,
          price: 45000,
        },
      ],
    },
    {
      id: "ord-2",
      number: "INV-2040",
      customerName: "Bayu Pratama",
      channel: "online",
      total: 136000,
      paidAt: daysFromNow(-1),
      status: "paid",
      items: [
        {
          productId: "prd-2",
          name: "Whiskas Tuna 1kg",
          quantity: 2,
          price: 68000,
        },
      ],
    },
    {
      id: "ord-3",
      number: "INV-2039",
      soldById: "stf-3",
      customerName: "Rina Kartika",
      channel: "pos",
      total: 92000,
      paidAt: null,
      status: "draft",
      items: [
        {
          productId: "prd-4",
          name: "Grooming Shampoo 500ml",
          quantity: 1,
          price: 92000,
        },
      ],
    },
  ],
  suppliers: [
    {
      id: "sup-1",
      name: "Anugrah Pet Supply",
      contact: "Pak Anwar",
      phone: "+62 21 555 0101",
      terms: "Net 30",
    },
    {
      id: "sup-2",
      name: "Pet Gear Nusantara",
      contact: "Bu Dewi",
      phone: "+62 21 555 0202",
      terms: "Net 14",
    },
    {
      id: "sup-3",
      name: "Bersih Hewan",
      contact: "Pak Joko",
      phone: "+62 21 555 0303",
      terms: "Cash on delivery",
    },
  ],
  warehouses: [
    { id: "wh-1", name: "Kemang Store Room", branch: "Kemang" },
    { id: "wh-2", name: "Bintaro Store Room", branch: "Bintaro" },
  ],
  batches: [
    {
      id: "bat-1",
      productId: "prd-1",
      productName: "Royal Canin Adult 2kg",
      warehouseId: "wh-1",
      lot: "RC-2409",
      quantity: 30,
      expiresAt: daysFromNow(240),
    },
    {
      id: "bat-2",
      productId: "prd-1",
      productName: "Royal Canin Adult 2kg",
      warehouseId: "wh-2",
      lot: "RC-2410",
      quantity: 12,
      expiresAt: daysFromNow(20),
    },
    {
      id: "bat-3",
      productId: "prd-2",
      productName: "Whiskas Tuna 1kg",
      warehouseId: "wh-1",
      lot: "WK-1122",
      quantity: 8,
      expiresAt: daysFromNow(-5),
    },
    {
      id: "bat-4",
      productId: "prd-4",
      productName: "Grooming Shampoo 500ml",
      warehouseId: "wh-1",
      lot: "SH-0301",
      quantity: 3,
      expiresAt: daysFromNow(400),
    },
  ],
  movements: [
    {
      id: "mv-1",
      productId: "prd-1",
      productName: "Royal Canin Adult 2kg",
      warehouseId: "wh-1",
      type: "in",
      quantity: 40,
      reference: "PO-3001",
      createdAt: daysFromNow(-14),
    },
    {
      id: "mv-2",
      productId: "prd-2",
      productName: "Whiskas Tuna 1kg",
      warehouseId: "wh-1",
      type: "out",
      quantity: -2,
      reference: "INV-2040",
      createdAt: daysFromNow(-1),
    },
    {
      id: "mv-3",
      productId: "prd-1",
      productName: "Royal Canin Adult 2kg",
      warehouseId: "wh-2",
      type: "transfer",
      quantity: 12,
      reference: "TRF-119",
      createdAt: daysFromNow(-6),
    },
    {
      id: "mv-4",
      productId: "prd-4",
      productName: "Grooming Shampoo 500ml",
      warehouseId: "wh-1",
      type: "adjustment",
      quantity: -1,
      reference: "Stock count",
      createdAt: daysFromNow(-3),
    },
  ],
  purchaseOrders: [
    {
      id: "po-1",
      number: "PO-3002",
      supplierId: "sup-1",
      supplierName: "Anugrah Pet Supply",
      status: "ordered",
      expectedAt: daysFromNow(4),
      items: [
        {
          productId: "prd-2",
          name: "Whiskas Tuna 1kg",
          quantity: 24,
          cost: 52000,
          received: 0,
        },
      ],
    },
    {
      id: "po-2",
      number: "PO-3003",
      supplierId: "sup-3",
      supplierName: "Bersih Hewan",
      status: "draft",
      expectedAt: daysFromNow(9),
      items: [
        {
          productId: "prd-4",
          name: "Grooming Shampoo 500ml",
          quantity: 20,
          cost: 61000,
          received: 0,
        },
      ],
    },
  ],
  branches: [
    {
      id: "br-1",
      name: "Kemang",
      address: "Jl. Kemang Raya 42, Jakarta Selatan",
      phone: "+62 21 555 1000",
      manager: "Sinta Wijaya",
    },
    {
      id: "br-2",
      name: "Bintaro",
      address: "Jl. Bintaro Utama 8, Tangerang Selatan",
      phone: "+62 21 555 2000",
      manager: "Bayu Pratama",
    },
  ],
  staff: [
    {
      id: "stf-1",
      name: "Sinta Wijaya",
      email: "sinta@acmepets.id",
      role: "manager",
      branch: "Kemang",
      phone: "+62 812-1111-2222",
      status: "active",
      commissionRate: 5,
    },
    {
      id: "stf-2",
      name: "Dimas Aditya",
      email: "dimas@acmepets.id",
      role: "groomer",
      branch: "Kemang",
      phone: "+62 815-7777-8888",
      status: "active",
      commissionRate: 12,
    },
    {
      id: "stf-3",
      name: "Putri Ayu",
      email: "putri@acmepets.id",
      role: "cashier",
      branch: "Kemang",
      phone: "+62 816-9999-0000",
      status: "on_leave",
      commissionRate: 0,
    },
    {
      id: "stf-4",
      name: "Bayu Pratama",
      email: "bayu@acmepets.id",
      role: "manager",
      branch: "Bintaro",
      phone: "+62 813-3333-4444",
      status: "active",
      commissionRate: 5,
    },
    {
      id: "stf-5",
      name: "Rizky Hakim",
      email: "rizky@acmepets.id",
      role: "caretaker",
      branch: "Bintaro",
      phone: "+62 817-4444-5555",
      status: "active",
      commissionRate: 3,
    },
  ],
  accounts: [
    { id: "acc-cash", code: "1010", name: "Cash", type: "asset" },
    { id: "acc-bank", code: "1020", name: "Bank", type: "asset" },
    { id: "acc-petty", code: "1030", name: "Petty cash", type: "asset" },
    { id: "acc-stock", code: "1200", name: "Inventory", type: "asset" },
    {
      id: "acc-ar",
      code: "1100",
      name: "Accounts receivable",
      type: "asset",
    },
    { id: "acc-ap", code: "2010", name: "Accounts payable", type: "liability" },
    { id: "acc-sales", code: "4010", name: "Sales", type: "income" },
    {
      id: "acc-boarding",
      code: "4020",
      name: "Boarding income",
      type: "income",
    },
    {
      id: "acc-cogs",
      code: "5010",
      name: "Cost of goods sold",
      type: "expense",
    },
    { id: "acc-wages", code: "6010", name: "Wages", type: "expense" },
    { id: "acc-rent", code: "6020", name: "Rent", type: "expense" },
    { id: "acc-supplies", code: "6030", name: "Supplies", type: "expense" },
    { id: "acc-utilities", code: "6040", name: "Utilities", type: "expense" },
  ],
  journal: [
    {
      id: "je-1",
      date: daysFromNow(-30),
      reference: "OPEN",
      memo: "Opening balances",
      lines: [
        { accountId: "acc-bank", debit: 25000000, credit: 0 },
        { accountId: "acc-cash", debit: 2000000, credit: 0 },
        { accountId: "acc-petty", debit: 500000, credit: 0 },
        { accountId: "acc-stock", debit: 8000000, credit: 0 },
        { accountId: "acc-ap", debit: 0, credit: 35500000 },
      ],
    },
    {
      id: "je-2",
      date: daysFromNow(-7),
      reference: "RENT-08",
      memo: "Monthly rent, Kemang",
      lines: [
        { accountId: "acc-rent", debit: 6500000, credit: 0 },
        { accountId: "acc-bank", debit: 0, credit: 6500000 },
      ],
    },
    {
      id: "je-3",
      date: daysFromNow(-3),
      reference: "BRD-1039",
      memo: "Boarding, Luna",
      lines: [
        { accountId: "acc-cash", debit: 1050000, credit: 0 },
        { accountId: "acc-boarding", debit: 0, credit: 1050000 },
      ],
    },
  ],
  expenses: [
    {
      id: "exp-1",
      date: daysFromNow(-7),
      category: "Rent",
      description: "Monthly rent, Kemang",
      amount: 6500000,
      paidFrom: "acc-bank",
    },
    {
      id: "exp-2",
      date: daysFromNow(-2),
      category: "Supplies",
      description: "Cleaning supplies",
      amount: 180000,
      paidFrom: "acc-petty",
    },
  ],
  shifts: [
    {
      id: "sh-1",
      staffId: "stf-2",
      staffName: "Dimas Aditya",
      date: daysFromNow(0),
      clockIn: "08:02",
      clockOut: null,
    },
    {
      id: "sh-2",
      staffId: "stf-1",
      staffName: "Sinta Wijaya",
      date: daysFromNow(0),
      clockIn: "07:55",
      clockOut: "16:10",
    },
    {
      id: "sh-3",
      staffId: "stf-5",
      staffName: "Rizky Hakim",
      date: daysFromNow(-1),
      clockIn: "08:10",
      clockOut: "17:02",
    },
  ],
  grooming: [
    {
      id: "grm-1",
      customerId: "cus-1",
      customerName: "Sinta Wijaya",
      petName: "Milo",
      service: "Full groom",
      groomerId: "stf-2",
      groomerName: "Dimas Aditya",
      branch: "Kemang",
      scheduledAt: daysFromNow(0),
      status: "in_progress",
      price: 250000,
    },
    {
      id: "grm-2",
      customerId: "cus-3",
      customerName: "Rina Kartika",
      petName: "Coco",
      service: "Bath and dry",
      groomerId: "stf-2",
      groomerName: "Dimas Aditya",
      branch: "Kemang",
      scheduledAt: daysFromNow(0.3),
      status: "booked",
      price: 120000,
    },
    {
      id: "grm-3",
      customerId: "cus-2",
      customerName: "Bayu Pratama",
      petName: "Bruno",
      service: "Nail trim",
      groomerId: "stf-5",
      groomerName: "Rizky Hakim",
      branch: "Bintaro",
      scheduledAt: daysFromNow(-1),
      status: "done",
      price: 60000,
    },
  ],
  loyalty: [
    {
      id: "loy-1",
      customerId: "cus-1",
      customerName: "Sinta Wijaya",
      date: daysFromNow(-20),
      points: 1200,
      reason: "Boarding, 8 nights",
    },
    {
      id: "loy-2",
      customerId: "cus-1",
      customerName: "Sinta Wijaya",
      date: daysFromNow(-5),
      points: 40,
      reason: "Retail purchase",
    },
    {
      id: "loy-3",
      customerId: "cus-2",
      customerName: "Bayu Pratama",
      date: daysFromNow(-12),
      points: 380,
      reason: "Boarding, 3 nights",
    },
    {
      id: "loy-4",
      customerId: "cus-3",
      customerName: "Rina Kartika",
      date: daysFromNow(-3),
      points: 90,
      reason: "Grooming",
    },
  ],
  whatsappTemplates: [
    {
      id: "wat-1",
      name: "Boarding reminder",
      category: "reminder",
      body: "Hi {{name}}, {{pet}} is booked in with us on {{date}}. See you then!",
      status: "approved",
    },
    {
      id: "wat-2",
      name: "Grooming ready",
      category: "reminder",
      body: "{{pet}} is all done and ready for collection.",
      status: "approved",
    },
    {
      id: "wat-3",
      name: "Weekend promo",
      category: "marketing",
      body: "20% off grooming this weekend for {{name}}.",
      status: "pending",
    },
  ],
  whatsappMessages: [
    {
      id: "wam-1",
      templateId: "wat-1",
      templateName: "Boarding reminder",
      to: "+62 812-1111-2222",
      customerName: "Sinta Wijaya",
      sentAt: daysFromNow(-1),
      status: "read",
    },
    {
      id: "wam-2",
      templateId: "wat-2",
      templateName: "Grooming ready",
      to: "+62 813-3333-4444",
      customerName: "Bayu Pratama",
      sentAt: daysFromNow(-0.5),
      status: "delivered",
    },
  ],
  subscription: {
    plan: "pro",
    price: 499000,
    interval: "month",
    renewsAt: daysFromNow(18),
    status: "active",
    limits: { staff: 10, branches: 3, boardingsPerMonth: 200 },
  },
  billingInvoices: [
    {
      id: "bil-1",
      number: "SUB-0007",
      date: daysFromNow(-12),
      amount: 499000,
      status: "paid",
    },
    {
      id: "bil-2",
      number: "SUB-0006",
      date: daysFromNow(-42),
      amount: 499000,
      status: "paid",
    },
  ],
  contactMessages: [],
  branchHolidays: [],
  staffInvites: [],
  returns: [],
  audit: [],
  loyaltyConfig: {
    rupiahPerPoint: 1000,
    tiers: [
      { name: "Gold", from: 1000 },
      { name: "Silver", from: 300 },
      { name: "Bronze", from: 0 },
    ],
  },
  apiKeys: [],
  webhookSubscriptions: [],
  webhookDeliveries: [],
  documentTemplates: [
    {
      type: "receipt",
      title: "Receipt",
      header: "Thank you for visiting Acme Pet Care.",
      footer: "Your pet had a lovely time.",
      showLogo: true,
      showStaff: true,
      showBranch: true,
      body: "",
    },
    {
      type: "agreement",
      title: "Boarding agreement",
      header: "This agreement covers the stay described below.",
      footer: "Signed on collection.",
      showLogo: true,
      showStaff: false,
      showBranch: true,
      body:
        "The owner confirms vaccinations are up to date and agrees to " +
        "settle any veterinary costs incurred during the stay.",
    },
  ],
  advances: [
    {
      id: "adv-1",
      staffId: "stf-3",
      staffName: "Putri Ayu",
      amount: 1500000,
      installment: 300000,
      notes: "School fees.",
      createdAt: daysFromNow(-40),
      payments: [
        {
          id: "advp-1",
          date: daysFromNow(-25),
          amount: 300000,
          source: "manual",
        },
        {
          id: "advp-2",
          date: daysFromNow(-10),
          amount: 300000,
          source: "commission",
        },
      ],
    },
  ],
  business: {
    slug: "acme-pets",
    name: "Acme Pet Care",
    ownerEmail: "sinta@acmepets.id",
    ownerName: "Sinta Wijaya",
    tagline: "Boarding, grooming and everything your pet needs.",
    address: "Jl. Kemang Raya 42, Jakarta Selatan",
    phone: "+62 21 555 1000",
    hours: "Mon–Sat 08:00–19:00, Sun 09:00–15:00",
    portalEnabled: true,
  },
  invoices: [
    {
      id: "inv-1",
      number: "INV-5001",
      customerId: "cus-1",
      customerName: "Sinta Wijaya",
      issueDate: daysFromNow(-12),
      dueDate: daysFromNow(-2),
      items: [
        {
          name: "Boarding, 5 nights",
          quantity: 5,
          unitPrice: 150000,
          discount: 0,
        },
        { name: "Full groom", quantity: 1, unitPrice: 250000, discount: 50000 },
      ],
      taxRate: 0.11,
      notes: "Long-stay package.",
      payments: [],
      isVoid: false,
    },
    {
      id: "inv-2",
      number: "INV-5002",
      customerId: "cus-2",
      customerName: "Bayu Pratama",
      issueDate: daysFromNow(-6),
      dueDate: daysFromNow(8),
      items: [
        {
          name: "Grooming package",
          quantity: 2,
          unitPrice: 180000,
          discount: 0,
        },
      ],
      taxRate: 0.11,
      notes: "",
      payments: [
        {
          id: "pay-1",
          date: daysFromNow(-4),
          amount: 200000,
          method: "bank",
          reference: "TRF-8891",
        },
      ],
      isVoid: false,
    },
    {
      id: "inv-3",
      number: "INV-5003",
      customerId: "cus-3",
      customerName: "Rina Kartika",
      issueDate: daysFromNow(-20),
      dueDate: daysFromNow(-10),
      items: [
        {
          name: "Deluxe boarding, 3 nights",
          quantity: 3,
          unitPrice: 210000,
          discount: 0,
        },
      ],
      taxRate: 0.11,
      notes: "",
      payments: [
        {
          id: "pay-2",
          date: daysFromNow(-9),
          amount: 699300,
          method: "cash",
          reference: "CASH-2201",
        },
      ],
      isVoid: false,
    },
  ],
  portalServices: [
    {
      id: "svc-1",
      name: "Overnight boarding",
      description: "A room of their own, walks and an evening photo.",
      category: "Boarding",
      durationMinutes: 1440,
      price: 150000,
      isActive: true,
    },
    {
      id: "svc-2",
      name: "Full groom",
      description: "Bath, blow dry, nails and a tidy up.",
      category: "Grooming",
      durationMinutes: 90,
      price: 250000,
      isActive: true,
    },
    {
      id: "svc-3",
      name: "Nail clipping",
      description: "Quick trim while you wait.",
      category: "Grooming",
      durationMinutes: 20,
      price: 60000,
      isActive: false,
    },
  ],
  portalReviews: [
    {
      id: "rev-1",
      customerName: "Sinta Wijaya",
      rating: 5,
      body: "Milo came home happy and smelling wonderful.",
      createdAt: daysFromNow(-9),
    },
    {
      id: "rev-2",
      customerName: "Bayu Pratama",
      rating: 4,
      body: "Good care, though pickup took a while on Saturday.",
      createdAt: daysFromNow(-3),
    },
  ],
};

/**
 * Loads the pet store data, seeding it on first use.
 *
 * @returns the persisted pet store state.
 */
function loadState(): State {
  if (typeof window === "undefined") {
    return seed;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      // Layer the saved data over the seed rather than returning it as-is: a
      // browser that persisted before a collection was added would otherwise
      // never see that key, and the handlers spread it. The two object-valued
      // members are merged a level deeper for the same reason – a new field on
      // one of them would be lost to a wholesale overwrite.
      const savedState = JSON.parse(saved) as Partial<State>;
      return {
        ...seed,
        ...savedState,
        business: { ...seed.business, ...savedState.business },
        subscription: { ...seed.subscription, ...savedState.subscription },
      };
    }
  } catch (_err) {
    // fall through to the seed
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

let state = loadState();

/** Bumped whenever the data actually changes, so the audit log cannot lie. */
let revision = 0;

function persist() {
  revision += 1;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_err) {
    // storage unavailable; keep the in-memory copy
  }
}

/**
 * Whether a boarding holds its room at any point between two dates.
 *
 * @param boarding the boarding to test.
 * @param from start of the window, as a timestamp.
 * @param to end of the window, as a timestamp.
 * @returns true when the stay overlaps the window and has not ended.
 */
function isOccupyingBetween(
  boarding: Boarding,
  from: number,
  to: number
): boolean {
  if (boarding.status === "checked_out" || boarding.status === "cancelled") {
    return false;
  }
  return (
    new Date(boarding.checkIn).getTime() <= to &&
    new Date(boarding.checkOut).getTime() >= from
  );
}

/**
 * Occupancy per room over a date range, derived from the boardings rather
 * than stored.
 *
 * A stay is booked for a window, so availability has to be judged over that
 * window: a room that is full today may be free next week, and a room that is
 * empty today may already be spoken for.
 *
 * @param from start of the window, defaulting to now.
 * @param to end of the window, defaulting to `from`.
 * @returns each room with the guests it holds during the window.
 */
export function roomOccupancy(from = Date.now(), to = from) {
  return state.rooms.map((room) => {
    const guests = state.boardings.filter(
      (boarding) =>
        boarding.roomId === room.id && isOccupyingBetween(boarding, from, to)
    );
    return {
      ...room,
      occupied: guests.length,
      isFull: guests.length >= room.capacity,
      guests: guests.map((guest) => ({
        id: guest.id,
        petName: guest.petName,
        customerName: guest.customerName,
        checkOut: guest.checkOut,
      })),
    };
  });
}

/** The stay a visitor is quoted for when they do not name their own dates. */
const defaultStay = () => ({
  checkIn: daysFromNow(1),
  checkOut: daysFromNow(3),
});

/**
 * An invoice with its money worked out.
 *
 * Totals and status are derived rather than stored: an invoice that says
 * "paid" while its payments add up to less would be a lie the books could not
 * catch, so there is nothing to keep in step.
 *
 * @param invoice the invoice to price.
 * @returns the invoice with subtotal, tax, total, paid and status.
 */
export function priceInvoice(invoice: Invoice) {
  const subtotal = invoice.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity - item.discount,
    0
  );
  const tax = Math.round(subtotal * invoice.taxRate);
  const total = subtotal + tax;
  const paid = invoice.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );
  const due = Math.max(0, total - paid);

  const status: "void" | "paid" | "partial" | "unpaid" = invoice.isVoid
    ? "void"
    : due === 0
      ? "paid"
      : paid > 0
        ? "partial"
        : "unpaid";

  return {
    ...invoice,
    subtotal,
    tax,
    total,
    paid,
    due,
    status,
    isOverdue:
      status !== "paid" &&
      status !== "void" &&
      new Date(invoice.dueDate).getTime() < Date.now(),
  };
}

/**
 * A cash advance with what is left to repay.
 *
 * Like an invoice, the balance is derived from the repayments rather than
 * stored alongside them.
 *
 * @param advance the advance to total.
 * @returns the advance with repaid, remaining and status.
 */
export function priceAdvance(advance: Advance) {
  const repaid = advance.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );
  const remaining = Math.max(0, advance.amount - repaid);
  return {
    ...advance,
    repaid,
    remaining,
    status: remaining === 0 ? ("paid_off" as const) : ("active" as const),
  };
}

/**
 * Which page each kind of insight belongs to.
 *
 * An insight is a summary of a page's data, so it should only reach someone
 * who could open that page and read the same thing in full.
 */
const INSIGHT_ROUTE: Record<string, string> = {
  inventory: "/inventory",
  invoices: "/invoices",
  occupancy: "/occupancy",
  loyalty: "/loyalty",
};

/** Rupiah, for the prose in insights. */
const money = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

/** How serious each severity is, most serious first. */
const SEVERITY_RANK: Record<Insight["severity"], number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

/**
 * What the records say is worth attention.
 *
 * Every one of these is worked out from a record and points back at it, so a
 * reader can go and check. Nothing here is generated or guessed – there is no
 * model behind it, only rules over the shop's own data.
 *
 * @returns the insights, most serious first.
 */
export function insights(): Insight[] {
  const found: Insight[] = [];
  const now = Date.now();

  state.products
    .filter((product) => product.status === "active")
    .forEach((product) => {
      // A product sold in sizes runs out one size at a time, so each is
      // judged on its own rather than on the total.
      const low = product.variants
        ? product.variants.filter(
            (variant) => variant.stock <= product.reorderLevel
          )
        : product.stock <= product.reorderLevel
          ? [null]
          : [];

      low.forEach((variant) => {
        const stock = variant ? variant.stock : product.stock;
        const label = variant
          ? `${product.name} ${variant.name}`
          : product.name;
        found.push({
          id: `ins-stock-${product.id}-${variant?.id ?? "all"}`,
          type: "alert",
          severity: stock === 0 ? "critical" : "warning",
          title: stock === 0 ? "Out of stock" : "Stock at its reorder level",
          description: `${label} has ${stock} left, and reorders at ${product.reorderLevel}.`,
          module: "inventory",
          relatedId: product.id,
        });
      });
    });

  state.invoices.map(priceInvoice).forEach((invoice) => {
    if (invoice.isOverdue) {
      found.push({
        id: `ins-invoice-${invoice.id}`,
        type: "alert",
        severity: "critical",
        title: "Invoice past its due date",
        description: `${invoice.number} for ${invoice.customerName} is past due with ${money(invoice.due)} still owed.`,
        module: "invoices",
        relatedId: invoice.id,
      });
    }
  });

  state.batches
    .filter((batch) => new Date(batch.expiresAt).getTime() < now)
    .forEach((batch) => {
      found.push({
        id: `ins-batch-${batch.id}`,
        type: "anomaly",
        severity: "warning",
        title: "Stock past its expiry",
        description: `Lot ${batch.lot} of ${batch.productName} expired and is still counted in stock.`,
        module: "inventory",
        relatedId: batch.id,
      });
    });

  const scope = currentBranch();

  roomOccupancy()
    .filter((room) => !scope || room.branch === scope)
    .forEach((room) => {
      if (room.isFull) {
        found.push({
          id: `ins-room-${room.id}`,
          type: "trend",
          severity: "info",
          title: "Room is full",
          description: `${room.name} is at its capacity of ${room.capacity} today.`,
          module: "occupancy",
          relatedId: room.id,
        });
      }
    });

  // Someone with points worth having who has not been in for a while is worth
  // a message before they drift off.
  state.customers
    .filter((customer) => customer.loyaltyPoints >= 1000)
    .forEach((customer) => {
      const lastSeen = state.boardings
        .filter((boarding) => boarding.customerId === customer.id)
        .map((boarding) => new Date(boarding.checkOut).getTime())
        .sort((a, b) => b - a)[0];

      if (lastSeen === undefined || now - lastSeen > 30 * 86400000) {
        found.push({
          id: `ins-loyal-${customer.id}`,
          type: "recommendation",
          severity: "info",
          title: "Worth getting back in",
          description: `${customer.name} has ${customer.loyaltyPoints} points and has not stayed with us recently.`,
          module: "loyalty",
          relatedId: customer.id,
        });
      }
    });

  return found.sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
  );
}

/**
 * Every code a product occupies – its own, and its variants'.
 *
 * @param product the product to read.
 * @returns the codes.
 */
function codesOf(product: Product): string[] {
  return [product.sku, ...(product.variants ?? []).map((v) => v.sku)];
}

/**
 * A product's stock, which is the sum of its variants when it has them.
 *
 * @param product the product to count.
 * @returns the product with its stock made to agree with its variants.
 */
function withVariantStock(product: Product): Product {
  if (!product.variants) {
    return product;
  }
  return {
    ...product,
    stock: product.variants.reduce((sum, variant) => sum + variant.stock, 0),
  };
}

/**
 * Takings per day, for the trend on the dashboard.
 *
 * Every day in the range gets a point, including the quiet ones – a chart
 * that leaves them out draws a busier shop than there was.
 *
 * @param days how many days back to go, ending today.
 * @returns one entry per day, oldest first.
 */
export function revenueTrend(days: number) {
  const paid = state.orders.filter(
    (order) => order.status === "paid" && order.paidAt
  );

  return Array.from({ length: days }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (days - 1 - index));
    const key = day.toDateString();
    const onDay = paid.filter(
      (order) => new Date(order.paidAt as string).toDateString() === key
    );

    return {
      date: day.toISOString(),
      revenue: onDay.reduce((sum, order) => sum + order.total, 0),
      orders: onDay.length,
    };
  });
}

/**
 * What has sold best, by the name each line was sold under.
 *
 * Sizes are counted separately because that is how they are sold, and
 * anything handed back is taken off again – otherwise a refunded item would
 * keep flattering the figures.
 *
 * @returns sellers, best first.
 */
export function topSellers() {
  const totals = new Map<string, { units: number; revenue: number }>();

  const add = (name: string, units: number, revenue: number) => {
    const running = totals.get(name) ?? { units: 0, revenue: 0 };
    totals.set(name, {
      units: running.units + units,
      revenue: running.revenue + revenue,
    });
  };

  state.orders
    .filter((order) => order.status === "paid")
    .forEach((order) => {
      order.items.forEach((item) => {
        add(item.name, item.quantity, item.price * item.quantity);
      });
    });

  state.returns.forEach((record) => {
    record.items.forEach((item) => {
      const line = state.orders
        .find((order) => order.id === record.orderId)
        ?.items.find((orderLine) => orderLine.productId === item.productId);
      add(item.name, -item.quantity, -(line?.price ?? 0) * item.quantity);
    });
  });

  return [...totals.entries()]
    .map(([name, figures]) => ({ name, ...figures }))
    .sort((a, b) => b.units - a.units);
}

/**
 * The time now, as a shift records it.
 *
 * Shifts are kept as `hh:mm` rather than timestamps, matching what a clock on
 * the wall shows.
 *
 * @returns the time, zero-padded.
 */
function clockTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
}

/**
 * The accounts money actually sits in.
 *
 * Named rather than guessed from the code range: an account being an asset
 * does not make it spendable – stock and money owed to us are assets too.
 */
const CASH_ACCOUNTS = ["acc-cash", "acc-bank", "acc-petty"];

/**
 * Money in and out of each account it sits in.
 *
 * Anything older than the window counts as what the account opened with, so
 * opening plus movement always comes to the closing balance.
 *
 * @param days how far back the movement runs; all of it when not given.
 * @returns one row per account holding money.
 */
export function cashFlow(days?: number) {
  const from = days ? Date.now() - days * 86400000 : undefined;

  return state.accounts
    .filter((account) => CASH_ACCOUNTS.includes(account.id))
    .map((account) => {
      let opening = 0;
      let received = 0;
      let paid = 0;

      state.journal.forEach((entry) => {
        const withinWindow =
          from === undefined || new Date(entry.date).getTime() >= from;

        entry.lines
          .filter((line) => line.accountId === account.id)
          .forEach((line) => {
            if (withinWindow) {
              received += line.debit;
              paid += line.credit;
            } else {
              opening += line.debit - line.credit;
            }
          });
      });

      return {
        accountId: account.id,
        name: account.name,
        opening,
        received,
        paid,
        closing: opening + received - paid,
      };
    });
}

/**
 * The days a branch is shut between two dates.
 *
 * @param branch the branch to check.
 * @param from start of the window.
 * @param to end of the window.
 * @returns the closures that fall inside it.
 */
function closuresBetween(branch: string, from: number, to: number) {
  // Compared as whole days: a closure is recorded at midnight, while a stay
  // carries a time of day, so an hours-level comparison would miss a closure
  // falling on the day someone arrives.
  const startOfDay = (time: number) => {
    const day = new Date(time);
    day.setHours(0, 0, 0, 0);
    return day.getTime();
  };

  const first = startOfDay(from);
  const last = startOfDay(to);

  return state.branchHolidays.filter((holiday) => {
    if (holiday.branch !== branch) {
      return false;
    }
    const day = startOfDay(new Date(`${holiday.date}T00:00:00`).getTime());
    return day >= first && day <= last;
  });
}

/**
 * Room by day, for the occupancy calendar.
 *
 * Each day is judged on its own so a stay shows across every day it covers
 * rather than only the day it starts.
 *
 * @param days how many days wide the grid is.
 * @param from the first day, defaulting to today.
 * @returns a row per room, each with a cell per day.
 */
export function occupancyCalendar(days: number, from?: string) {
  const start = from ? new Date(`${from}T00:00:00`) : new Date();
  start.setHours(0, 0, 0, 0);

  // Narrowed to the branch being looked at, when one is chosen.
  const scope = currentBranch();

  return state.rooms
    .filter((room) => !scope || room.branch === scope)
    .map((room) => ({
      roomId: room.id,
      roomName: room.name,
      branch: room.branch,
      capacity: room.capacity,
      type: room.type,
      days: Array.from({ length: days }, (_, index) => {
        const day = new Date(start);
        day.setDate(day.getDate() + index);
        const dayStart = day.getTime();
        const dayEnd = dayStart + 86399000;

        const guests = state.boardings.filter(
          (boarding) =>
            boarding.roomId === room.id &&
            boarding.status !== "cancelled" &&
            boarding.status !== "checked_out" &&
            new Date(boarding.checkIn).getTime() <= dayEnd &&
            new Date(boarding.checkOut).getTime() >= dayStart
        );

        return {
          date: day.toISOString(),
          occupied: guests.length,
          isFull: guests.length >= room.capacity,
          isClosed: closuresBetween(room.branch, dayStart, dayStart).length > 0,
          guests: guests.map((guest) => ({
            boardingId: guest.id,
            petName: guest.petName,
            customerName: guest.customerName,
          })),
        };
      }),
    }));
}

/**
 * How far the shop is from being set up.
 *
 * Each step is worked out from the records themselves rather than a flag
 * somebody ticked, so it cannot claim something is done that is not.
 *
 * @returns the steps, in the order they are worth doing.
 */
export function onboardingSteps() {
  return [
    {
      id: "branches",
      title: "Add where you trade from",
      done: state.branches.length > 0,
      path: "/branches",
    },
    {
      id: "rooms",
      title: "Add the rooms you board in",
      done: state.rooms.length > 0,
      path: "/branches",
    },
    {
      id: "staff",
      title: "Add the people who work here",
      done: state.staff.length > 0,
      path: "/staff",
    },
    {
      id: "products",
      title: "Put something in the catalogue",
      done: state.products.length > 0,
      path: "/products",
    },
    {
      id: "customers",
      title: "Add your first customer",
      done: state.customers.length > 0,
      path: "/customers",
    },
    {
      id: "portal",
      title: "Open the shopfront to the public",
      done: state.business.portalEnabled,
      path: "/portal",
    },
    {
      id: "sale",
      title: "Take your first sale",
      done: state.orders.some((order) => order.status === "paid"),
      path: "/pos",
    },
  ];
}

/**
 * Groomer by day, for the grooming calendar.
 *
 * @param days how many days wide the grid is.
 * @param from the first day, defaulting to today.
 * @returns a row per groomer, each with a cell per day.
 */
export function groomingCalendar(days: number, from?: string) {
  const start = from ? new Date(`${from}T00:00:00`) : new Date();
  start.setHours(0, 0, 0, 0);
  const scope = currentBranch();

  return state.staff
    .filter(
      (member) =>
        member.role === "groomer" && (!scope || member.branch === scope)
    )
    .map((groomer) => ({
      groomerId: groomer.id,
      groomerName: groomer.name,
      branch: groomer.branch,
      days: Array.from({ length: days }, (_, index) => {
        const day = new Date(start);
        day.setDate(day.getDate() + index);
        const key = day.toDateString();

        return {
          date: day.toISOString(),
          isClosed:
            closuresBetween(groomer.branch, day.getTime(), day.getTime())
              .length > 0,
          appointments: state.grooming
            .filter(
              (item) =>
                item.groomerId === groomer.id &&
                item.status !== "cancelled" &&
                new Date(item.scheduledAt).toDateString() === key
            )
            .map((item) => ({
              id: item.id,
              petName: item.petName,
              customerName: item.customerName,
              service: item.service,
              status: item.status,
              price: item.price,
            })),
        };
      }),
    }));
}

/** The roles a staff record may hold. */
const STAFF_ROLES = ["owner", "manager", "groomer", "cashier", "caretaker"];

/** Nightly rate per room type. */
const RATES: Record<Room["type"], number> = {
  standard: 150000,
  deluxe: 210000,
  suite: 275000,
};

/**
 * The expense account a category posts to.
 *
 * @param category the expense category.
 * @returns the account id to debit.
 */
function expenseAccountFor(category: string): string {
  const map: Record<string, string> = {
    Rent: "acc-rent",
    Wages: "acc-wages",
    Supplies: "acc-supplies",
    Utilities: "acc-utilities",
  };
  return map[category] ?? "acc-supplies";
}

/** What each plan costs per month. */
const PLAN_PRICES: Record<string, number> = {
  free: 0,
  pro: 499000,
  business: 1290000,
};

/** What each plan allows. */
const PLAN_LIMITS: Record<string, Subscription["limits"]> = {
  free: { staff: 3, branches: 1, boardingsPerMonth: 30 },
  pro: { staff: 10, branches: 3, boardingsPerMonth: 200 },
  business: { staff: 50, branches: 20, boardingsPerMonth: 2000 },
};

/**
 * Usage against the current plan's limits, counted from live records rather
 * than tracked separately.
 *
 * @returns each limit with its current usage.
 */
export function planUsage() {
  const monthAgo = Date.now() - 30 * 86400000;
  return {
    staff: {
      used: state.staff.length,
      limit: state.subscription.limits.staff,
    },
    branches: {
      used: state.branches.length,
      limit: state.subscription.limits.branches,
    },
    boardings: {
      used: state.boardings.filter(
        (boarding) => new Date(boarding.checkIn).getTime() >= monthAgo
      ).length,
      limit: state.subscription.limits.boardingsPerMonth,
    },
  };
}

/**
 * Sums the journal into a balance per account.
 *
 * Income and liability accounts are credit-natured, so their balance is
 * credits less debits; everything else is the other way round.
 *
 * @returns each account with its balance.
 */
export function trialBalance() {
  return state.accounts.map((account) => {
    const lines = state.journal.flatMap((entry) =>
      entry.lines.filter((line) => line.accountId === account.id)
    );
    const debit = lines.reduce((total, line) => total + line.debit, 0);
    const credit = lines.reduce((total, line) => total + line.credit, 0);
    const creditNatured =
      account.type === "income" ||
      account.type === "liability" ||
      account.type === "equity";

    return {
      ...account,
      debit,
      credit,
      balance: creditNatured ? credit - debit : debit - credit,
    };
  });
}

/**
 * Commission owed per staff member, from the sales their branch has taken.
 *
 * @returns each active staff member with their commission.
 */
export function commissions() {
  const paid = state.orders.filter((order) => order.status === "paid");

  const scope = currentBranch();

  return state.staff
    .filter(
      (member) =>
        member.commissionRate > 0 && (!scope || member.branch === scope)
    )
    .map((member) => {
      // Only what this person actually rang up counts. Anything voided has
      // already left `paid`, and anything handed back comes off again.
      const theirs = paid.filter((order) => order.soldById === member.id);
      const sold = theirs.reduce((total, order) => total + order.total, 0);
      const handedBack = state.returns
        .filter((record) => theirs.some((order) => order.id === record.orderId))
        .reduce((total, record) => total + record.refundAmount, 0);
      const base = Math.max(0, sold - handedBack);

      return {
        id: member.id,
        name: member.name,
        branch: member.branch,
        role: member.role,
        rate: member.commissionRate,
        base,
        amount: Math.round((base * member.commissionRate) / 100),
      };
    });
}

/**
 * Aggregates the figures shown on the pet store dashboard.
 *
 * @returns today's revenue, occupancy, and counts of pending work.
 */
function dashboard() {
  // Narrowed to the branch being looked at, so the figures describe what is
  // on screen rather than the whole shop.
  const scope = currentBranch();
  const inScope = (branch: string) => !scope || branch === scope;

  const activeBoardings = state.boardings.filter(
    (boarding) => boarding.status === "checked_in" && inScope(boarding.branch)
  );
  const occupancy = roomOccupancy().filter((room) => inScope(room.branch));
  const capacity = occupancy.reduce((total, room) => total + room.capacity, 0);
  const occupied = occupancy.reduce((total, room) => total + room.occupied, 0);
  const paidToday = state.orders.filter(
    (order) =>
      order.paidAt && Date.now() - new Date(order.paidAt).getTime() < 86400000
  );

  return {
    revenueToday: paidToday.reduce((total, order) => total + order.total, 0),
    ordersToday: paidToday.length,
    activeBoardings: activeBoardings.length,
    arrivalsToday: state.boardings.filter(
      (boarding) =>
        boarding.status === "booked" &&
        inScope(boarding.branch) &&
        new Date(boarding.checkIn).getTime() - Date.now() < 86400000
    ).length,
    occupancyRate: capacity ? Math.round((occupied / capacity) * 100) : 0,
    capacity,
    occupied,
    lowStock: state.products.filter(
      (product) => product.stock <= product.reorderLevel
    ).length,
    unpaidOrders: state.orders.filter((order) => order.status === "draft")
      .length,
  };
}

/**
 * Handles a pet store API action.
 *
 * @param action the API action after the `/api/` prefix.
 * @param body the parsed request body.
 * @returns a response payload, or undefined when the action is not ours.
 */
/** How many changes the log keeps before the oldest fall off. */
const AUDIT_LIMIT = 200;

/** How many delivery attempts are kept. */
const DELIVERY_LIMIT = 200;

/**
 * A random token for a secret.
 *
 * @param length how many characters to produce.
 * @returns the token.
 */
function randomToken(length: number): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

/**
 * Whether a string is somewhere a webhook could actually be sent.
 *
 * @param url the address given.
 * @returns true when it is an http(s) address.
 */
function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_err) {
    return false;
  }
}

/**
 * Describes a change in a few words, for the log.
 *
 * @param action the endpoint that made it.
 * @param body what was sent.
 * @returns a short description.
 */
function summarise(action: string, body: Record<string, unknown>): string {
  const named = body.name ?? body.customerName ?? body.petName ?? body.title;
  return named ? `${action} · ${String(named)}` : action;
}

/**
 * Answers a request, recording anything that changed.
 *
 * The log is written from whether the data actually changed rather than from
 * a list of endpoints, so a handler that refuses cannot leave a record saying
 * it did something.
 *
 * @param action the endpoint name.
 * @param body the request body.
 * @returns the response payload.
 */
export function handleShopRequest(
  action: string,
  body: Record<string, unknown>
): { data: unknown } | undefined {
  const before = revision;
  const response = dispatch(action, body);

  // Signing in and out changes who you are, not the shop's records.
  if (revision !== before && !action.startsWith("auth.")) {
    const entry: AuditEntry = {
      id: newId("aud"),
      at: new Date().toISOString(),
      action,
      actor: hasSession()
        ? (localStorage.getItem(SESSION_KEY) ?? "unknown")
        : "unknown",
      role: currentRole() ?? "unknown",
      summary: summarise(action, body),
    };
    // Anything listening for this event is told about it. Delivery rides on
    // the same signal as the audit log, so a refused change tells nobody.
    const listening = state.webhookSubscriptions.filter(
      (subscription) =>
        subscription.enabled &&
        // "*" is how Outline's own settings page says "all events".
        (subscription.events.includes("*") ||
          subscription.events.includes(action))
    );
    const deliveries: WebhookDelivery[] = listening.map((subscription) => ({
      id: newId("whd"),
      subscriptionId: subscription.id,
      subscriptionName: subscription.name,
      event: action,
      url: subscription.url,
      status: "delivered",
      statusCode: 200,
      at: entry.at,
    }));

    state = {
      ...state,
      audit: [entry, ...state.audit].slice(0, AUDIT_LIMIT),
      webhookDeliveries: [...deliveries, ...state.webhookDeliveries].slice(
        0,
        DELIVERY_LIMIT
      ),
    };
    // Written straight to storage: going through persist() would bump the
    // revision again and record the record.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_err) {
      // storage unavailable; keep the in-memory copy
    }
  }

  return response;
}

/**
 * The request handlers themselves.
 *
 * @param action the endpoint name.
 * @param body the request body.
 * @returns the response payload.
 */
function dispatch(
  action: string,
  body: Record<string, unknown>
): { data: unknown } | undefined {
  switch (action) {
    case "audit.list":
      return { data: state.audit };

    case "dashboard.trend":
      return { data: revenueTrend(Number(body.days ?? 14)) };

    case "dashboard.topSellers":
      return { data: topSellers() };

    case "onboarding.steps":
      return { data: onboardingSteps() };

    case "onboarding.progress": {
      const steps = onboardingSteps();
      return {
        data: {
          done: steps.filter((step) => step.done).length,
          total: steps.length,
        },
      };
    }

    case "insights.list": {
      const role = currentRole();
      return {
        data: insights().filter((insight) => {
          const route = INSIGHT_ROUTE[insight.module];
          // A module nobody has placed is kept back rather than shown on a
          // guess about who should see it.
          if (!route || !role) {
            return false;
          }
          return canAccessRoute(role, route);
        }),
      };
    }

    case "apiKeys.list":
      return { data: state.apiKeys };

    case "oauthAuthentications.list":
      // Nothing has been connected in the mock, but the page renders the
      // list beside the keys and expects an array rather than nothing.
      return { data: [] };

    case "apiKeys.create": {
      const name = String(body.name ?? "").trim();
      if (!name) {
        return undefined;
      }

      // The secret is what the caller will actually send, so it has to be
      // unpredictable rather than derived from anything on the record.
      const secret = `ol_api_${randomToken(32)}`;
      const key: ApiKey = {
        id: newId("apk"),
        name,
        value: secret,
        last4: secret.slice(-4),
        // Left unset when nothing was restricted: the settings page renders
        // "Restricted scope" for any value it is given, and [] is truthy.
        scope:
          Array.isArray(body.scope) && body.scope.length > 0
            ? (body.scope as string[])
            : undefined,
        expiresAt: body.expiresAt ? String(body.expiresAt) : null,
        lastActiveAt: null,
        // The settings page shows only the signed-in user's own keys.
        userId: mockDb.getState().user.id,
        createdAt: new Date().toISOString(),
      };

      state = { ...state, apiKeys: [...state.apiKeys, key] };
      persist();
      return { data: key };
    }

    case "apiKeys.delete": {
      const id = String(body.id ?? "");
      state = {
        ...state,
        apiKeys: state.apiKeys.filter((item) => item.id !== id),
      };
      persist();
      return { data: { success: true } };
    }

    case "webhookSubscriptions.list":
      return { data: state.webhookSubscriptions };

    case "webhookDeliveries.list":
      return { data: state.webhookDeliveries };

    case "webhookSubscriptions.create": {
      const name = String(body.name ?? "").trim();
      const url = String(body.url ?? "").trim();
      const events = (body.events ?? []) as string[];

      // A subscription with nowhere to send to, or nothing to listen for,
      // would sit there doing nothing while looking configured.
      if (!name || !isHttpUrl(url) || events.length === 0) {
        return undefined;
      }

      const subscription: WebhookSubscription = {
        id: newId("whs"),
        name,
        url,
        enabled: true,
        events,
        secret: body.secret ? String(body.secret) : null,
        createdAt: new Date().toISOString(),
      };
      state = {
        ...state,
        webhookSubscriptions: [...state.webhookSubscriptions, subscription],
      };
      persist();
      return { data: subscription };
    }

    case "webhookSubscriptions.update": {
      const id = String(body.id ?? "");
      const existing = state.webhookSubscriptions.find(
        (item) => item.id === id
      );
      if (!existing) {
        return undefined;
      }

      const url = String(body.url ?? existing.url).trim();
      const events = (body.events ?? existing.events) as string[];
      if (!isHttpUrl(url) || events.length === 0) {
        return undefined;
      }

      const updated: WebhookSubscription = {
        ...existing,
        name: String(body.name ?? existing.name),
        url,
        events,
        enabled:
          body.enabled === undefined ? existing.enabled : Boolean(body.enabled),
        secret:
          body.secret === undefined ? existing.secret : String(body.secret),
      };
      state = {
        ...state,
        webhookSubscriptions: state.webhookSubscriptions.map((item) =>
          item.id === id ? updated : item
        ),
      };
      persist();
      return { data: updated };
    }

    case "webhookSubscriptions.delete": {
      const id = String(body.id ?? "");
      state = {
        ...state,
        webhookSubscriptions: state.webhookSubscriptions.filter(
          (item) => item.id !== id
        ),
      };
      persist();
      return { data: { success: true } };
    }

    case "dashboard":
      return { data: dashboard() };

    case "products.list":
      return { data: state.products };

    case "customers.list":
      return { data: state.customers };

    case "boardings.list":
      return { data: state.boardings };

    case "grooming.calendar":
      return {
        data: groomingCalendar(
          Number(body.days ?? 14),
          body.from === undefined ? undefined : String(body.from)
        ),
      };

    case "occupancy.calendar":
      return {
        data: occupancyCalendar(
          Number(body.days ?? 14),
          body.from === undefined ? undefined : String(body.from)
        ),
      };

    case "rooms.list":
      return { data: roomOccupancy() };

    case "orders.create": {
      const items = (body.items ?? []) as Order["items"];
      const total = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const paidAt = new Date().toISOString();
      // Whoever is at the till gets the sale against their name, which is
      // what their commission is worked out on.
      const email = hasSession()
        ? localStorage.getItem(SESSION_KEY)?.toLowerCase()
        : undefined;
      const soldBy = email
        ? state.staff.find((member) => member.email.toLowerCase() === email)
        : undefined;

      const order: Order = {
        id: newId("ord"),
        number: `INV-${2042 + state.orders.length}`,
        customerName: String(body.customerName ?? "Walk-in"),
        channel: "pos",
        soldById: soldBy?.id ?? null,
        total,
        paidAt,
        status: "paid",
        items,
      };

      // A sale is not just an order: stock leaves the shelf and money arrives,
      // so it has to move the catalogue, the movement log and the books
      // together or the dashboard and the P&L will disagree.
      state = {
        ...state,
        orders: [order, ...state.orders],
        products: state.products.map((product) => {
          const sold = items.find((item) => item.productId === product.id);
          if (!sold) {
            return product;
          }
          // A sale comes off the size that was sold, not the product as a
          // whole, or the other sizes would silently lose stock.
          if (product.variants) {
            return withVariantStock({
              ...product,
              variants: product.variants.map((variant) =>
                variant.id === sold.variantId
                  ? {
                      ...variant,
                      stock: Math.max(0, variant.stock - sold.quantity),
                    }
                  : variant
              ),
            });
          }
          return {
            ...product,
            stock: Math.max(0, product.stock - sold.quantity),
          };
        }),
        movements: [
          ...items.map((item) => ({
            id: `${newId("mv")}-${item.productId}`,
            productId: item.productId,
            productName: item.name,
            warehouseId: state.warehouses[0]?.id ?? "wh-1",
            type: "out" as const,
            quantity: -item.quantity,
            reference: order.number,
            createdAt: paidAt,
          })),
          ...state.movements,
        ],
        journal: [
          {
            id: newId("je"),
            date: paidAt,
            reference: order.number,
            memo: `Sale to ${order.customerName}`,
            lines: [
              { accountId: "acc-cash", debit: total, credit: 0 },
              { accountId: "acc-sales", debit: 0, credit: total },
            ],
          },
          ...state.journal,
        ],
      };
      persist();
      return { data: order };
    }

    case "orders.void": {
      const id = String(body.id ?? "");
      const order = state.orders.find((item) => item.id === id);

      if (!order) {
        return { data: { voided: false, reason: "not_found" } };
      }

      const move = nextOrderState(order.status, {
        type: "VOID",
        hasReturns: state.returns.some((record) => record.orderId === id),
      });
      if (!move.ok) {
        return { data: { voided: false, reason: move.reason } };
      }

      const voidedAt = new Date().toISOString();
      const warehouseId = state.warehouses[0]?.id ?? "wh-1";

      state = {
        ...state,
        orders: state.orders.map((item) =>
          item.id === id ? { ...item, status: move.next } : item
        ),
        // Everything goes back on the shelf, down to the size that was sold.
        products: state.products.map((product) => {
          const sold = order.items.find(
            (item) => item.productId === product.id
          );
          if (!sold) {
            return product;
          }
          if (product.variants) {
            return withVariantStock({
              ...product,
              variants: product.variants.map((variant) =>
                variant.id === sold.variantId
                  ? { ...variant, stock: variant.stock + sold.quantity }
                  : variant
              ),
            });
          }
          return { ...product, stock: product.stock + sold.quantity };
        }),
        movements: [
          ...order.items.map((item, index) => ({
            id: `${newId("mv")}-${index}`,
            productId: item.productId,
            productName: item.name,
            warehouseId,
            type: "in" as const,
            quantity: item.quantity,
            reference: order.number,
            createdAt: voidedAt,
          })),
          ...state.movements,
        ],
        journal: [
          {
            id: newId("je"),
            date: voidedAt,
            reference: order.number,
            memo: `Voided sale to ${order.customerName}`,
            lines: [
              { accountId: "acc-sales", debit: order.total, credit: 0 },
              { accountId: "acc-cash", debit: 0, credit: order.total },
            ],
          },
          ...state.journal,
        ],
      };
      persist();
      return { data: { voided: true } };
    }

    case "orders.list":
      return { data: state.orders };

    case "orders.info":
      return {
        data: state.orders.find((order) => order.id === body.id) ?? null,
      };

    case "orders.markPaid": {
      const id = String(body.id ?? "");
      const order = state.orders.find((item) => item.id === id);

      if (!order) {
        return { data: { paid: false, reason: "not_found" } };
      }

      const move = nextOrderState(order.status, { type: "PAY" });
      if (!move.ok) {
        return { data: { paid: false, reason: move.reason } };
      }

      state = {
        ...state,
        orders: state.orders.map((item) =>
          item.id === id
            ? { ...item, status: move.next, paidAt: new Date().toISOString() }
            : item
        ),
      };
      persist();
      return { data: state.orders.find((item) => item.id === id) };
    }

    case "branches.holidays":
      return { data: state.branchHolidays };

    case "branches.addHoliday": {
      const branch = String(body.branch ?? "").trim();
      const date = String(body.date ?? "").slice(0, 10);

      if (!branch || !date) {
        return { data: { saved: false, reason: "missing_details" } };
      }
      if (
        state.branchHolidays.some(
          (holiday) => holiday.branch === branch && holiday.date === date
        )
      ) {
        return { data: { saved: false, reason: "duplicate" } };
      }
      // Closing on a day guests are booked in would leave them nowhere to go.
      const day = new Date(`${date}T00:00:00`).getTime();
      const booked = state.boardings.some(
        (boarding) =>
          boarding.branch === branch &&
          boarding.status !== "cancelled" &&
          boarding.status !== "checked_out" &&
          new Date(boarding.checkIn).getTime() <= day + 86399000 &&
          new Date(boarding.checkOut).getTime() >= day
      );
      if (booked) {
        return { data: { saved: false, reason: "has_guests" } };
      }

      const holiday: BranchHoliday = {
        id: newId("hol"),
        branch,
        date,
        reason: String(body.reason ?? ""),
      };
      state = {
        ...state,
        branchHolidays: [...state.branchHolidays, holiday],
      };
      persist();
      return { data: { saved: true, holiday } };
    }

    case "branches.removeHoliday": {
      const id = String(body.id ?? "");
      state = {
        ...state,
        branchHolidays: state.branchHolidays.filter((item) => item.id !== id),
      };
      persist();
      return { data: { removed: true } };
    }

    case "branches.list":
      return { data: state.branches };

    case "staff.invites":
      return { data: state.staffInvites };

    case "staff.invite": {
      const email = String(body.email ?? "")
        .trim()
        .toLowerCase();
      const role = String(body.role ?? "");
      const branch = String(body.branch ?? "").trim();

      if (!email || !branch) {
        return { data: { sent: false, reason: "missing_details" } };
      }
      if (!STAFF_ROLES.includes(role)) {
        return { data: { sent: false, reason: "bad_role" } };
      }
      if (state.staff.some((member) => member.email.toLowerCase() === email)) {
        return { data: { sent: false, reason: "already_staff" } };
      }
      // A second invitation to the same address would let one person join
      // twice under two records.
      if (
        state.staffInvites.some(
          (invite) => invite.email === email && invite.status === "pending"
        )
      ) {
        return { data: { sent: false, reason: "already_invited" } };
      }

      const invite: StaffInvite = {
        id: newId("inv"),
        email,
        name: String(body.name ?? ""),
        role,
        branch,
        status: "pending",
        sentAt: new Date().toISOString(),
      };
      state = { ...state, staffInvites: [...state.staffInvites, invite] };
      persist();
      return { data: { sent: true, invite } };
    }

    case "staff.acceptInvite": {
      const id = String(body.id ?? "");
      const invite = state.staffInvites.find((item) => item.id === id);

      if (!invite || invite.status !== "pending") {
        return { data: { accepted: false, reason: "not_pending" } };
      }

      const member: Staff = {
        id: newId("stf"),
        name: invite.name || invite.email.split("@")[0],
        email: invite.email,
        role: invite.role as Staff["role"],
        branch: invite.branch,
        phone: "",
        status: "active",
        commissionRate: 0,
      };

      state = {
        ...state,
        staff: [...state.staff, member],
        staffInvites: state.staffInvites.map((item) =>
          item.id === id ? { ...item, status: "accepted" as const } : item
        ),
      };
      persist();
      return { data: { accepted: true, member } };
    }

    case "staff.withdrawInvite": {
      const id = String(body.id ?? "");
      state = {
        ...state,
        staffInvites: state.staffInvites.filter((item) => item.id !== id),
      };
      persist();
      return { data: { withdrawn: true } };
    }

    case "staff.list":
      return { data: state.staff };

    case "staff.setStatus": {
      const id = String(body.id ?? "");
      const status = String(body.status ?? "") as Staff["status"];
      state = {
        ...state,
        staff: state.staff.map((member) =>
          member.id === id ? { ...member, status } : member
        ),
      };
      persist();
      return { data: state.staff.find((member) => member.id === id) };
    }

    case "rooms.create": {
      const room: Room = {
        id: newId("rm"),
        name: String(body.name ?? "New room"),
        branch: String(body.branch ?? state.branches[0]?.name ?? "Kemang"),
        capacity: Math.max(1, Number(body.capacity ?? 1)),
        type: String(body.type ?? "standard") as Room["type"],
      };
      state = { ...state, rooms: [...state.rooms, room] };
      persist();
      return { data: room };
    }

    case "rooms.update": {
      const id = String(body.id ?? "");
      state = {
        ...state,
        rooms: state.rooms.map((room) =>
          room.id === id
            ? {
                ...room,
                name: body.name !== undefined ? String(body.name) : room.name,
                capacity:
                  body.capacity !== undefined
                    ? Math.max(1, Number(body.capacity))
                    : room.capacity,
                type:
                  body.type !== undefined
                    ? (String(body.type) as Room["type"])
                    : room.type,
              }
            : room
        ),
      };
      persist();
      return { data: state.rooms.find((room) => room.id === id) };
    }

    case "rooms.delete": {
      const id = String(body.id ?? "");
      // A room with guests in it cannot be removed.
      const occupied = roomOccupancy().find((room) => room.id === id);
      if (occupied && occupied.occupied > 0) {
        return { data: { deleted: false, reason: "occupied" } };
      }
      state = {
        ...state,
        rooms: state.rooms.filter((room) => room.id !== id),
      };
      persist();
      return { data: { deleted: true } };
    }

    case "accounts.list":
      return { data: state.accounts };

    case "journal.list":
      return { data: state.journal };

    case "expenses.list":
      return { data: state.expenses };

    case "shifts.onShift":
      return {
        data: state.shifts
          .filter((shift) => !shift.clockOut)
          .map((shift) => ({
            staffId: shift.staffId,
            staffName: shift.staffName,
            since: shift.clockIn,
          })),
      };

    case "shifts.clockIn": {
      const staffId = String(body.staffId ?? "");
      const member = state.staff.find((item) => item.id === staffId);

      if (!member) {
        return { data: { ok: false, reason: "not_found" } };
      }
      // Someone on leave or off the books should not be starting a shift.
      if (member.status !== "active") {
        return { data: { ok: false, reason: "not_working" } };
      }
      // Two open shifts would make the hours count them twice.
      if (state.shifts.some((s) => s.staffId === staffId && !s.clockOut)) {
        return { data: { ok: false, reason: "already_in" } };
      }

      const shift: Shift = {
        id: newId("sh"),
        staffId,
        staffName: member.name,
        date: new Date().toISOString(),
        clockIn: clockTime(),
        clockOut: null,
      };

      state = { ...state, shifts: [shift, ...state.shifts] };
      persist();
      return { data: { ok: true, shift } };
    }

    case "shifts.clockOut": {
      const staffId = String(body.staffId ?? "");
      const open = state.shifts.find(
        (shift) => shift.staffId === staffId && !shift.clockOut
      );

      if (!open) {
        return { data: { ok: false, reason: "not_in" } };
      }

      const closed: Shift = { ...open, clockOut: clockTime() };
      state = {
        ...state,
        shifts: state.shifts.map((shift) =>
          shift.id === open.id ? closed : shift
        ),
      };
      persist();
      return { data: { ok: true, shift: closed } };
    }

    case "shifts.list":
      return { data: state.shifts };

    case "accounting.trialBalance":
      return { data: trialBalance() };

    case "accounting.cashFlow":
      return {
        data: cashFlow(body.days === undefined ? undefined : Number(body.days)),
      };

    case "accounting.commissions":
      return { data: commissions() };

    case "expenses.create": {
      const amount = Number(body.amount ?? 0);
      const category = String(body.category ?? "Supplies");
      const paidFrom = String(body.paidFrom ?? "acc-cash");
      const date = new Date().toISOString();
      const id = newId("exp");

      // Every expense posts a balanced entry: debit the expense, credit
      // whatever it was paid from.
      state = {
        ...state,
        expenses: [
          {
            id,
            date,
            category,
            description: String(body.description ?? category),
            amount,
            paidFrom,
          },
          ...state.expenses,
        ],
        journal: [
          {
            id: newId("je"),
            date,
            reference: id.toUpperCase(),
            memo: String(body.description ?? category),
            lines: [
              {
                accountId: expenseAccountFor(category),
                debit: amount,
                credit: 0,
              },
              { accountId: paidFrom, debit: 0, credit: amount },
            ],
          },
          ...state.journal,
        ],
      };
      persist();
      return { data: state.expenses[0] };
    }

    case "grooming.list":
      return { data: state.grooming };

    case "loyalty.config":
      return { data: state.loyaltyConfig };

    case "loyalty.saveConfig": {
      const rate =
        body.rupiahPerPoint === undefined
          ? state.loyaltyConfig.rupiahPerPoint
          : Number(body.rupiahPerPoint);
      const tiers = (body.tiers ?? state.loyaltyConfig.tiers) as {
        name: string;
        from: number;
      }[];

      // A rate of nothing would mint a point per rupiah of nothing spent.
      if (!Number.isFinite(rate) || rate <= 0) {
        return { data: { saved: false, reason: "bad_rate" } };
      }
      // Tiers are read from the top down, and everyone needs one to land in.
      const ordered = tiers.every(
        (tier, index) => index === 0 || tiers[index - 1].from > tier.from
      );
      if (
        tiers.length === 0 ||
        !ordered ||
        tiers[tiers.length - 1].from !== 0
      ) {
        return { data: { saved: false, reason: "bad_tiers" } };
      }

      state = {
        ...state,
        loyaltyConfig: { rupiahPerPoint: rate, tiers },
      };
      persist();
      return { data: { saved: true, config: state.loyaltyConfig } };
    }

    case "loyalty.list":
      return { data: state.loyalty };

    case "grooming.setStatus": {
      const id = String(body.id ?? "");
      const status = String(body.status ?? "") as Grooming["status"];
      const appointment = state.grooming.find((item) => item.id === id);

      state = {
        ...state,
        grooming: state.grooming.map((item) =>
          item.id === id ? { ...item, status } : item
        ),
      };

      // Finishing a groom takes the money and earns the customer points, the
      // same way a sale does.
      if (appointment && status === "done" && appointment.status !== "done") {
        const now = new Date().toISOString();
        const earned = Math.round(
          appointment.price / state.loyaltyConfig.rupiahPerPoint
        );
        const number = `INV-${2042 + state.orders.length}`;

        state = {
          ...state,
          journal: [
            {
              id: newId("je"),
              date: now,
              reference: number,
              memo: `${appointment.service}, ${appointment.petName}`,
              lines: [
                { accountId: "acc-cash", debit: appointment.price, credit: 0 },
                { accountId: "acc-sales", debit: 0, credit: appointment.price },
              ],
            },
            ...state.journal,
          ],
          orders: [
            {
              id: newId("ord"),
              number,
              customerName: appointment.customerName,
              channel: "pos",
              total: appointment.price,
              paidAt: now,
              status: "paid",
              items: [
                {
                  productId: appointment.id,
                  name: `${appointment.service} · ${appointment.petName}`,
                  quantity: 1,
                  price: appointment.price,
                },
              ],
            },
            ...state.orders,
          ],
          loyalty: [
            {
              id: newId("loy"),
              customerId: appointment.customerId,
              customerName: appointment.customerName,
              date: now,
              points: earned,
              reason: `Grooming, ${appointment.service}`,
            },
            ...state.loyalty,
          ],
          customers: state.customers.map((customer) =>
            customer.id === appointment.customerId
              ? {
                  ...customer,
                  loyaltyPoints: customer.loyaltyPoints + earned,
                }
              : customer
          ),
        };
      }

      persist();
      return { data: state.grooming.find((item) => item.id === id) };
    }

    case "loyalty.redeem": {
      const customerId = String(body.customerId ?? "");
      const points = Math.abs(Number(body.points ?? 0));
      const customer = state.customers.find((item) => item.id === customerId);

      if (!customer || customer.loyaltyPoints < points) {
        return { data: { redeemed: false, reason: "insufficient" } };
      }

      state = {
        ...state,
        customers: state.customers.map((item) =>
          item.id === customerId
            ? { ...item, loyaltyPoints: item.loyaltyPoints - points }
            : item
        ),
        loyalty: [
          {
            id: newId("loy"),
            customerId,
            customerName: customer.name,
            date: new Date().toISOString(),
            points: -points,
            reason: "Redeemed",
          },
          ...state.loyalty,
        ],
      };
      persist();
      return { data: { redeemed: true } };
    }

    case "whatsapp.templates":
      return { data: state.whatsappTemplates };

    case "whatsapp.messages":
      return { data: state.whatsappMessages };

    case "billing.subscription":
      return { data: state.subscription };

    case "billing.invoices":
      return { data: state.billingInvoices };

    case "billing.usage":
      return { data: planUsage() };

    case "whatsapp.send": {
      const templateId = String(body.templateId ?? "");
      const customerId = String(body.customerId ?? "");
      const template = state.whatsappTemplates.find(
        (item) => item.id === templateId
      );
      const customer = state.customers.find((item) => item.id === customerId);

      // Only approved templates can be sent, the same rule the provider applies.
      if (!template || !customer || template.status !== "approved") {
        return { data: { sent: false, reason: "not_approved" } };
      }

      state = {
        ...state,
        whatsappMessages: [
          {
            id: newId("wam"),
            templateId: template.id,
            templateName: template.name,
            to: customer.phone,
            customerName: customer.name,
            sentAt: new Date().toISOString(),
            status: "sent",
          },
          ...state.whatsappMessages,
        ],
      };
      persist();
      return { data: { sent: true } };
    }

    case "billing.changePlan": {
      const plan = String(body.plan ?? "pro") as Subscription["plan"];
      state = {
        ...state,
        subscription: {
          ...state.subscription,
          plan,
          price: PLAN_PRICES[plan] ?? 0,
          limits: PLAN_LIMITS[plan] ?? state.subscription.limits,
        },
      };
      persist();
      return { data: state.subscription };
    }

    case "business.info":
      return { data: state.business };

    case "portal.stats": {
      const reviews = state.portalReviews;
      const ratingTotal = reviews.reduce(
        (sum, review) => sum + review.rating,
        0
      );
      // Bookings that came in through the shopfront rather than the front
      // desk – that is what the portal is answerable for.
      const fromPortal = state.boardings.filter(
        (boarding) => boarding.customerId === "public"
      );

      return {
        data: {
          reviews: reviews.length,
          averageRating: reviews.length
            ? Math.round((ratingTotal / reviews.length) * 10) / 10
            : 0,
          activeServices: state.portalServices.filter(
            (service) => service.isActive
          ).length,
          totalServices: state.portalServices.length,
          pets: state.customers.reduce(
            (sum, customer) => sum + customer.pets.length,
            0
          ),
          portalBookings: fromPortal.length,
          enabled: state.business.portalEnabled,
          slug: state.business.slug,
        },
      };
    }

    case "portal.services.list":
      return { data: state.portalServices };

    case "portal.services.create": {
      const name = String(body.name ?? "").trim();
      if (!name) {
        return { data: { created: false, reason: "missing_name" } };
      }

      const service: PortalService = {
        id: newId("svc"),
        name,
        description: String(body.description ?? ""),
        category: String(body.category ?? "Grooming"),
        durationMinutes: Number(body.durationMinutes ?? 60),
        price: Number(body.price ?? 0),
        isActive: true,
      };
      state = { ...state, portalServices: [...state.portalServices, service] };
      persist();
      return { data: { created: true, service } };
    }

    case "portal.services.setActive": {
      const id = String(body.id ?? "");
      const isActive = Boolean(body.isActive);
      state = {
        ...state,
        portalServices: state.portalServices.map((service) =>
          service.id === id ? { ...service, isActive } : service
        ),
      };
      persist();
      return { data: state.portalServices.find((item) => item.id === id) };
    }

    case "portal.services.delete": {
      const id = String(body.id ?? "");
      state = {
        ...state,
        portalServices: state.portalServices.filter(
          (service) => service.id !== id
        ),
      };
      persist();
      return { data: { deleted: true } };
    }

    case "portal.reviews.list":
      return { data: state.portalReviews };

    case "portal.bookings":
      return {
        data: state.boardings.filter(
          (boarding) => boarding.customerId === "public"
        ),
      };

    case "portal.settings.update": {
      const slug = String(body.slug ?? state.business.slug)
        .trim()
        .toLowerCase();

      if (!/^[a-z0-9-]+$/.test(slug)) {
        // The slug is the public address; anything else would produce a
        // shopfront URL that cannot be reached.
        return { data: { saved: false, reason: "bad_slug" } };
      }

      state = {
        ...state,
        business: {
          ...state.business,
          slug,
          name: String(body.name ?? state.business.name),
          tagline: String(body.tagline ?? state.business.tagline),
          portalEnabled:
            body.portalEnabled === undefined
              ? state.business.portalEnabled
              : Boolean(body.portalEnabled),
        },
      };
      persist();
      return { data: { saved: true, business: state.business } };
    }

    case "public.business": {
      const slug = String(body.slug ?? "");
      // A slug that is not ours must not resolve, or every tenant would share
      // the same shopfront. Switching the portal off has to close it too,
      // otherwise the setting would only be decorative.
      const isOurs = state.business.slug === slug;
      return {
        data: isOurs && state.business.portalEnabled ? state.business : null,
      };
    }

    case "public.product": {
      const slug = String(body.slug ?? "");
      const product = state.products.find((item) => item.id === body.id);

      // Same gate as the shopfront itself, plus the publishing rule: a
      // shopper must not reach an archived or out of stock product by URL
      // just because it is missing from the list.
      if (
        state.business.slug !== slug ||
        !state.business.portalEnabled ||
        !product ||
        product.status !== "active" ||
        product.stock <= 0
      ) {
        return { data: null };
      }

      return {
        data: {
          id: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          sku: product.sku,
          inStock: product.stock > 0,
        },
      };
    }

    case "public.featured":
      return {
        data: state.products
          .filter((product) => product.status === "active" && product.stock > 0)
          .slice(0, 6)
          .map((product) => ({
            id: product.id,
            name: product.name,
            category: product.category,
            price: product.price,
          })),
      };

    case "public.availability": {
      // Only what a visitor needs: room types and whether any are free. Quote
      // the same window the booking form books, or the page would advertise
      // rooms the booking then refuses.
      const stay = defaultStay();
      const occupancy = roomOccupancy(
        new Date(stay.checkIn).getTime(),
        new Date(stay.checkOut).getTime()
      );
      const byType = new Map<
        string,
        { type: string; free: number; total: number; from: number }
      >();

      occupancy.forEach((room) => {
        const rate = RATES[room.type];
        const entry = byType.get(room.type) ?? {
          type: room.type,
          free: 0,
          total: 0,
          from: rate,
        };
        entry.total += room.capacity;
        entry.free += Math.max(0, room.capacity - room.occupied);
        byType.set(room.type, entry);
      });

      return { data: Array.from(byType.values()) };
    }

    case "public.booking.create": {
      const petName = String(body.petName ?? "").trim();
      const customerName = String(body.customerName ?? "").trim();
      const roomType = String(body.roomType ?? "standard");

      if (!petName || !customerName) {
        return { data: { created: false, reason: "missing_details" } };
      }

      const stay = defaultStay();
      const checkIn = String(body.checkIn ?? stay.checkIn);
      const checkOut = String(body.checkOut ?? stay.checkOut);

      // Judge the room over the nights being booked, not over today, and
      // only offer one at a branch that is actually open then.
      const openFrom = new Date(checkIn).getTime();
      const openTo = new Date(checkOut).getTime();
      const room = roomOccupancy(openFrom, openTo).find(
        (item) =>
          item.type === roomType &&
          !item.isFull &&
          closuresBetween(item.branch, openFrom, openTo).length === 0
      );

      if (!room) {
        return { data: { created: false, reason: "no_room" } };
      }

      const rate = RATES[roomType as Room["type"]] ?? RATES.standard;
      const code = `BRD-${1044 + state.boardings.length}`;

      state = {
        ...state,
        boardings: [
          ...state.boardings,
          {
            id: newId("bd"),
            code,
            customerId: "public",
            customerName,
            petName,
            roomId: room.id,
            roomName: room.name,
            branch: room.branch,
            checkIn,
            checkOut,
            status: "booked",
            ratePerNight: rate,
          },
        ],
      };
      persist();
      return { data: { created: true, code, room: room.name } };
    }

    case "auth.signIn": {
      const email = String(body.email ?? "")
        .trim()
        .toLowerCase();
      const password = String(body.password ?? "");

      if (!email || !password) {
        return { data: { ok: false, reason: "missing" } };
      }
      // The business owner signs in as the owner; everyone else signs in as
      // whatever their staff record says they are.
      const isOwner = email === state.business.ownerEmail.toLowerCase();
      const member = state.staff.find(
        (item) => item.email.toLowerCase() === email
      );

      if (!isOwner && !member) {
        return { data: { ok: false, reason: "unknown" } };
      }
      if (password.length < 8) {
        return { data: { ok: false, reason: "invalid" } };
      }
      // Someone who has left must not keep their way in.
      if (!isOwner && member?.status === "inactive") {
        return { data: { ok: false, reason: "inactive" } };
      }

      const role = isOwner ? "owner" : (member?.role ?? "caretaker");
      setSession(email, role);
      return {
        data: {
          ok: true,
          name: isOwner ? state.business.ownerName : (member?.name ?? ""),
          role,
        },
      };
    }

    case "auth.delete":
      setSession(null);
      return { data: { ok: true } };

    case "auth.signUp": {
      const email = String(body.email ?? "").trim();
      const businessName = String(body.businessName ?? "").trim();

      if (!email.includes("@") || !businessName) {
        return { data: { ok: false, reason: "missing" } };
      }
      if (email.toLowerCase() === state.business.ownerEmail.toLowerCase()) {
        return { data: { ok: false, reason: "taken" } };
      }
      return { data: { ok: true, businessName } };
    }

    case "auth.forgotPassword": {
      const email = String(body.email ?? "").trim();
      // Always reports success so the form cannot be used to discover which
      // addresses have an account.
      return { data: { ok: email.includes("@") } };
    }

    case "auth.resetPassword": {
      const password = String(body.password ?? "");
      const confirm = String(body.confirm ?? "");

      if (password.length < 8) {
        return { data: { ok: false, reason: "short" } };
      }
      if (password !== confirm) {
        return { data: { ok: false, reason: "mismatch" } };
      }
      return { data: { ok: true } };
    }

    case "contact.submit": {
      const name = String(body.name ?? "").trim();
      const email = String(body.email ?? "").trim();
      const message = String(body.message ?? "").trim();

      if (!name || !email.includes("@") || message.length < 10) {
        return { data: { ok: false, reason: "incomplete" } };
      }

      state = {
        ...state,
        contactMessages: [
          {
            id: newId("msg"),
            name,
            email,
            message,
            sentAt: new Date().toISOString(),
          },
          ...state.contactMessages,
        ],
      };
      persist();
      return { data: { ok: true } };
    }

    case "products.save": {
      const id = String(body.id ?? "");
      const name = String(body.name ?? "").trim();
      const sku = String(body.sku ?? "").trim();

      if (!name || !sku) {
        return { data: { saved: false, reason: "missing_details" } };
      }
      const incomingVariants = (body.variants ?? undefined) as
        | {
            id?: string;
            name: string;
            sku: string;
            price: number;
            stock: number;
          }[]
        | undefined;

      // A code has to point at one thing or stock cannot be counted – across
      // products and across the sizes within them.
      const mine = [sku, ...(incomingVariants ?? []).map((v) => v.sku.trim())];
      if (new Set(mine).size !== mine.length) {
        return { data: { saved: false, reason: "duplicate_sku" } };
      }
      const takenElsewhere = state.products
        .filter((item) => item.id !== id)
        .flatMap(codesOf);
      if (mine.some((code) => takenElsewhere.includes(code))) {
        return { data: { saved: false, reason: "duplicate_sku" } };
      }

      const existing = state.products.find((item) => item.id === id);
      const variants = incomingVariants?.map((variant, index) => ({
        id: variant.id || `${newId("prv")}-${index}`,
        name: variant.name,
        sku: variant.sku.trim(),
        price: Number(variant.price ?? 0),
        stock: Number(variant.stock ?? 0),
      }));

      const product: Product = withVariantStock({
        id: existing?.id ?? newId("prd"),
        sku,
        name,
        category: String(body.category ?? existing?.category ?? "Food"),
        price: Number(body.price ?? existing?.price ?? 0),
        stock: Number(body.stock ?? existing?.stock ?? 0),
        reorderLevel: Number(body.reorderLevel ?? existing?.reorderLevel ?? 0),
        supplier: String(body.supplier ?? existing?.supplier ?? ""),
        status:
          (body.status as Product["status"]) ?? existing?.status ?? "active",
        variants: variants ?? existing?.variants,
      });

      state = {
        ...state,
        products: existing
          ? state.products.map((item) => (item.id === id ? product : item))
          : [...state.products, product],
      };
      persist();
      return { data: { saved: true, product } };
    }

    case "products.delete": {
      const id = String(body.id ?? "");
      const product = state.products.find((item) => item.id === id);

      if (!product) {
        return { data: { removed: false, reason: "not_found" } };
      }

      // Anything already sold, ordered or counted has to stay, or the records
      // that mention it would point at nothing. Archive it instead.
      const isReferenced =
        state.orders.some((order) =>
          order.items.some((item) => item.productId === id)
        ) ||
        state.movements.some((movement) => movement.productId === id) ||
        state.batches.some((batch) => batch.productId === id) ||
        state.purchaseOrders.some((order) =>
          order.items.some((item) => item.productId === id)
        );

      if (isReferenced) {
        state = {
          ...state,
          products: state.products.map((item) =>
            item.id === id ? { ...item, status: "archived" } : item
          ),
        };
        persist();
        return { data: { removed: false, reason: "in_use" } };
      }

      state = {
        ...state,
        products: state.products.filter((item) => item.id !== id),
      };
      persist();
      return { data: { removed: true } };
    }

    case "customers.save": {
      const id = String(body.id ?? "");
      const name = String(body.name ?? "").trim();

      if (!name) {
        return { data: { saved: false, reason: "missing_details" } };
      }

      const existing = state.customers.find((item) => item.id === id);
      const incoming = (body.pets ?? existing?.pets ?? []) as {
        id?: string;
        name: string;
        species: string;
        breed: string;
      }[];

      const customer: Customer = {
        id: existing?.id ?? newId("cus"),
        name,
        phone: String(body.phone ?? existing?.phone ?? ""),
        email: String(body.email ?? existing?.email ?? ""),
        // Every pet needs an id of its own so a boarding can name one. A form
        // with nothing to send yet sends "", which is not nullish.
        pets: incoming.map((pet, index) => ({
          id: pet.id || `${newId("pet")}-${index}`,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
        })),
        loyaltyPoints: existing?.loyaltyPoints ?? 0,
        joinedAt: existing?.joinedAt ?? new Date().toISOString(),
      };

      state = {
        ...state,
        customers: existing
          ? state.customers.map((item) => (item.id === id ? customer : item))
          : [...state.customers, customer],
      };
      persist();
      return { data: { saved: true, customer } };
    }

    case "customers.delete": {
      const id = String(body.id ?? "");

      const isReferenced =
        state.boardings.some((item) => item.customerId === id) ||
        state.grooming.some((item) => item.customerId === id) ||
        state.invoices.some((item) => item.customerId === id) ||
        state.loyalty.some((item) => item.customerId === id);

      if (isReferenced) {
        return { data: { removed: false, reason: "in_use" } };
      }

      state = {
        ...state,
        customers: state.customers.filter((item) => item.id !== id),
      };
      persist();
      return { data: { removed: true } };
    }

    case "staff.save": {
      const id = String(body.id ?? "");
      const name = String(body.name ?? "").trim();
      const email = String(body.email ?? "")
        .trim()
        .toLowerCase();
      const role = String(body.role ?? "");

      if (!name || !email) {
        return { data: { saved: false, reason: "missing_details" } };
      }
      if (!STAFF_ROLES.includes(role)) {
        return { data: { saved: false, reason: "bad_role" } };
      }
      // Two people signing in as the same address would be one account.
      if (state.staff.some((item) => item.email === email && item.id !== id)) {
        return { data: { saved: false, reason: "duplicate_email" } };
      }

      const existing = state.staff.find((item) => item.id === id);
      const member: Staff = {
        id: existing?.id ?? newId("stf"),
        name,
        email,
        role: role as Staff["role"],
        branch: String(body.branch ?? existing?.branch ?? ""),
        phone: String(body.phone ?? existing?.phone ?? ""),
        status:
          (body.status as Staff["status"]) ?? existing?.status ?? "active",
        commissionRate: Number(
          body.commissionRate ?? existing?.commissionRate ?? 0
        ),
      };

      state = {
        ...state,
        staff: existing
          ? state.staff.map((item) => (item.id === id ? member : item))
          : [...state.staff, member],
      };
      persist();
      return { data: { saved: true, member } };
    }

    case "staff.delete": {
      const id = String(body.id ?? "");

      // Money lent against wages has to be settled before the person goes.
      const owes = state.advances.some(
        (advance) =>
          advance.staffId === id && priceAdvance(advance).remaining > 0
      );
      if (owes) {
        return { data: { removed: false, reason: "owes_advance" } };
      }

      state = {
        ...state,
        staff: state.staff.filter((item) => item.id !== id),
      };
      persist();
      return { data: { removed: true } };
    }

    case "suppliers.save": {
      const id = String(body.id ?? "");
      const name = String(body.name ?? "").trim();

      if (!name) {
        return { data: { saved: false, reason: "missing_details" } };
      }

      const existing = state.suppliers.find((item) => item.id === id);
      const supplier: Supplier = {
        id: existing?.id ?? newId("sup"),
        name,
        contact: String(body.contact ?? existing?.contact ?? ""),
        phone: String(body.phone ?? existing?.phone ?? ""),
        terms: String(body.terms ?? existing?.terms ?? "Net 30"),
      };

      state = {
        ...state,
        suppliers: existing
          ? state.suppliers.map((item) => (item.id === id ? supplier : item))
          : [...state.suppliers, supplier],
      };
      persist();
      return { data: { saved: true, supplier } };
    }

    case "suppliers.delete": {
      const id = String(body.id ?? "");

      const hasOpenOrder = state.purchaseOrders.some(
        (order) =>
          order.supplierId === id &&
          order.status !== "received" &&
          order.status !== "cancelled"
      );
      if (hasOpenOrder) {
        return { data: { removed: false, reason: "in_use" } };
      }

      state = {
        ...state,
        suppliers: state.suppliers.filter((item) => item.id !== id),
      };
      persist();
      return { data: { removed: true } };
    }

    case "warehouses.save": {
      const id = String(body.id ?? "");
      const name = String(body.name ?? "").trim();

      if (!name) {
        return { data: { saved: false, reason: "missing_details" } };
      }

      const existing = state.warehouses.find((item) => item.id === id);
      const warehouse: Warehouse = {
        id: existing?.id ?? newId("wh"),
        name,
        branch: String(body.branch ?? existing?.branch ?? ""),
      };

      state = {
        ...state,
        warehouses: existing
          ? state.warehouses.map((item) => (item.id === id ? warehouse : item))
          : [...state.warehouses, warehouse],
      };
      persist();
      return { data: { saved: true, warehouse } };
    }

    case "warehouses.delete": {
      const id = String(body.id ?? "");

      const holdsStock =
        state.batches.some((batch) => batch.warehouseId === id) ||
        state.movements.some((movement) => movement.warehouseId === id);
      if (holdsStock) {
        return { data: { removed: false, reason: "in_use" } };
      }

      state = {
        ...state,
        warehouses: state.warehouses.filter((item) => item.id !== id),
      };
      persist();
      return { data: { removed: true } };
    }

    case "branches.save": {
      const id = String(body.id ?? "");
      const name = String(body.name ?? "").trim();

      if (!name) {
        return { data: { saved: false, reason: "missing_details" } };
      }

      const existing = state.branches.find((item) => item.id === id);
      const branch: Branch = {
        id: existing?.id ?? newId("br"),
        name,
        address: String(body.address ?? existing?.address ?? ""),
        phone: String(body.phone ?? existing?.phone ?? ""),
        manager: String(body.manager ?? existing?.manager ?? ""),
      };

      state = {
        ...state,
        branches: existing
          ? state.branches.map((item) => (item.id === id ? branch : item))
          : [...state.branches, branch],
      };
      persist();
      return { data: { saved: true, branch } };
    }

    case "branches.delete": {
      const id = String(body.id ?? "");
      const branch = state.branches.find((item) => item.id === id);

      if (!branch) {
        return { data: { removed: false, reason: "not_found" } };
      }
      // Rooms and staff are recorded against the branch name, so a branch
      // cannot leave while anything still names it.
      const isReferenced =
        state.rooms.some((room) => room.branch === branch.name) ||
        state.staff.some((member) => member.branch === branch.name);
      if (isReferenced) {
        return { data: { removed: false, reason: "in_use" } };
      }

      state = {
        ...state,
        branches: state.branches.filter((item) => item.id !== id),
      };
      persist();
      return { data: { removed: true } };
    }

    case "suppliers.list":
      return { data: state.suppliers };

    case "warehouses.list":
      return { data: state.warehouses };

    case "batches.list":
      return { data: state.batches };

    case "movements.list":
      return { data: state.movements };

    case "purchaseOrders.list":
      return { data: state.purchaseOrders };

    case "purchaseOrders.create": {
      const supplierId = String(body.supplierId ?? "");
      const items = (body.items ?? []) as PurchaseOrderItem[];
      const supplier = state.suppliers.find((item) => item.id === supplierId);

      if (!supplier || items.length === 0) {
        return { data: { created: false, reason: "missing_details" } };
      }

      const order: PurchaseOrder = {
        id: newId("po"),
        number: `PO-${3002 + state.purchaseOrders.length}`,
        supplierId,
        supplierName: supplier.name,
        status: "ordered",
        expectedAt: String(body.expectedAt ?? daysFromNow(7)),
        items: items.map((item) => ({ ...item, received: 0 })),
      };

      state = {
        ...state,
        purchaseOrders: [order, ...state.purchaseOrders],
      };
      persist();
      return { data: { created: true, order } };
    }

    case "documentTemplates.list":
      return { data: state.documentTemplates };

    case "documentTemplates.save": {
      const type = body.type === "agreement" ? "agreement" : "receipt";
      const existing = state.documentTemplates.find(
        (item) => item.type === type
      );

      if (!existing) {
        return { data: { saved: false, reason: "unknown_type" } };
      }
      if (!String(body.title ?? existing.title).trim()) {
        // A template with no title prints an unlabelled document.
        return { data: { saved: false, reason: "missing_title" } };
      }

      const updated: DocumentTemplate = {
        ...existing,
        title: String(body.title ?? existing.title),
        header: String(body.header ?? existing.header),
        footer: String(body.footer ?? existing.footer),
        body: String(body.body ?? existing.body),
        showLogo:
          body.showLogo === undefined
            ? existing.showLogo
            : Boolean(body.showLogo),
        showStaff:
          body.showStaff === undefined
            ? existing.showStaff
            : Boolean(body.showStaff),
        showBranch:
          body.showBranch === undefined
            ? existing.showBranch
            : Boolean(body.showBranch),
      };

      state = {
        ...state,
        documentTemplates: state.documentTemplates.map((item) =>
          item.type === type ? updated : item
        ),
      };
      persist();
      return { data: { saved: true, template: updated } };
    }

    case "returns.list":
      return { data: state.returns };

    case "returns.create": {
      const orderId = String(body.orderId ?? "");
      const order = state.orders.find((item) => item.id === orderId);

      if (!order) {
        return { data: { created: false, reason: "not_found" } };
      }
      // Nothing was taken for it, so there is nothing to give back.
      if (order.status !== "paid") {
        return { data: { created: false, reason: "not_paid" } };
      }

      const asked = (body.items ?? []) as {
        productId: string;
        variantId?: string;
        quantity: number;
        isDamaged?: boolean;
      }[];
      const wanted = asked.filter((item) => Number(item.quantity) > 0);

      if (wanted.length === 0) {
        return { data: { created: false, reason: "nothing_returned" } };
      }

      // What is left to return is what was bought less what has already gone
      // back on earlier returns against this order.
      const alreadyReturned = (productId: string) =>
        state.returns
          .filter((item) => item.orderId === orderId)
          .flatMap((item) => item.items)
          .filter((item) => item.productId === productId)
          .reduce((sum, item) => sum + item.quantity, 0);

      for (const item of wanted) {
        const line = order.items.find(
          (orderLine) => orderLine.productId === item.productId
        );
        if (!line) {
          return { data: { created: false, reason: "not_on_order" } };
        }
        const refundable = line.quantity - alreadyReturned(item.productId);
        if (Number(item.quantity) > refundable) {
          return { data: { created: false, reason: "too_many", refundable } };
        }
      }

      const createdAt = new Date().toISOString();
      const items: ReturnItem[] = wanted.map((item) => {
        const line = order.items.find(
          (orderLine) => orderLine.productId === item.productId
        );
        return {
          productId: item.productId,
          variantId: item.variantId ?? line?.variantId,
          name: line?.name ?? "",
          quantity: Number(item.quantity),
          isDamaged: Boolean(item.isDamaged),
        };
      });

      const refundAmount = items.reduce((sum, item) => {
        const line = order.items.find(
          (orderLine) => orderLine.productId === item.productId
        );
        return sum + (line?.price ?? 0) * item.quantity;
      }, 0);

      const method = body.refundMethod === "bank" ? "bank" : "cash";
      const record: Return = {
        id: newId("ret"),
        orderId,
        orderNumber: order.number,
        customerName: order.customerName,
        createdAt,
        reason: String(body.reason ?? ""),
        refundMethod: method,
        refundAmount,
        items,
      };

      const resalable = items.filter((item) => !item.isDamaged);
      const warehouseId = state.warehouses[0]?.id ?? "wh-1";

      state = {
        ...state,
        returns: [record, ...state.returns],
        // Only what can be sold again goes back on the shelf – and onto the
        // size it came from, not the product as a whole.
        products: state.products.map((product) => {
          const back = resalable.find((item) => item.productId === product.id);
          if (!back) {
            return product;
          }
          if (product.variants) {
            return withVariantStock({
              ...product,
              variants: product.variants.map((variant) =>
                variant.id === back.variantId
                  ? { ...variant, stock: variant.stock + back.quantity }
                  : variant
              ),
            });
          }
          return { ...product, stock: product.stock + back.quantity };
        }),
        movements: [
          ...resalable.map((item, index) => ({
            id: `${newId("mv")}-${index}`,
            productId: item.productId,
            productName: item.name,
            warehouseId,
            type: "in" as const,
            quantity: item.quantity,
            reference: order.number,
            createdAt,
          })),
          ...state.movements,
        ],
        // The refund reverses the sale: the income comes back off and the
        // money goes out again.
        journal: [
          {
            id: newId("je"),
            date: createdAt,
            reference: order.number,
            memo: `Refund to ${order.customerName}`,
            lines: [
              { accountId: "acc-sales", debit: refundAmount, credit: 0 },
              {
                accountId: method === "bank" ? "acc-bank" : "acc-cash",
                debit: 0,
                credit: refundAmount,
              },
            ],
          },
          ...state.journal,
        ],
      };
      persist();
      return { data: { created: true, return: record } };
    }

    case "advances.list":
      return { data: state.advances.map(priceAdvance) };

    case "advances.create": {
      const staffId = String(body.staffId ?? "");
      const amount = Number(body.amount ?? 0);
      const member = state.staff.find((item) => item.id === staffId);

      if (!member || amount <= 0) {
        return { data: { created: false, reason: "missing_details" } };
      }

      const advance: Advance = {
        id: newId("adv"),
        staffId,
        staffName: member.name,
        amount,
        installment: Number(body.installment ?? Math.round(amount / 5)),
        notes: String(body.notes ?? ""),
        createdAt: new Date().toISOString(),
        payments: [],
      };

      state = { ...state, advances: [advance, ...state.advances] };
      persist();
      return { data: { created: true, advance: priceAdvance(advance) } };
    }

    case "advances.repay": {
      const id = String(body.id ?? "");
      const amount = Number(body.amount ?? 0);
      const advance = state.advances.find((item) => item.id === id);

      if (!advance) {
        return { data: { repaid: false, reason: "not_found" } };
      }

      const priced = priceAdvance(advance);
      if (amount <= 0) {
        return { data: { repaid: false, reason: "bad_amount" } };
      }
      if (amount > priced.remaining) {
        // Repaying more than is owed would leave the staff member in credit
        // against an advance that no longer exists.
        return {
          data: {
            repaid: false,
            reason: "overpay",
            remaining: priced.remaining,
          },
        };
      }

      const payment: AdvancePayment = {
        id: newId("advp"),
        date: new Date().toISOString(),
        amount,
        source: body.source === "commission" ? "commission" : "manual",
      };

      state = {
        ...state,
        advances: state.advances.map((item) =>
          item.id === id
            ? { ...item, payments: [...item.payments, payment] }
            : item
        ),
      };
      persist();
      return {
        data: {
          repaid: true,
          advance: priceAdvance(
            state.advances.find((item) => item.id === id) as Advance
          ),
        },
      };
    }

    case "purchaseOrders.receive": {
      const id = String(body.id ?? "");
      const order = state.purchaseOrders.find((item) => item.id === id);
      if (!order) {
        return { data: { received: false, reason: "not_found" } };
      }
      if (order.status === "received" || order.status === "cancelled") {
        return { data: { received: false, reason: "closed" } };
      }

      // Goods can turn up in more than one delivery, so the caller says how
      // many of each line arrived. Absent quantities mean "all of it", which
      // is what receiving a whole order used to do.
      const quantities = (body.quantities ?? {}) as Record<string, number>;
      const arriving = order.items.map((line) => {
        const outstanding = line.quantity - line.received;
        const asked =
          quantities[line.productId] === undefined
            ? outstanding
            : Number(quantities[line.productId]);
        return {
          line,
          // Never book in more than was ordered, or stock would outrun the
          // purchase order that justified it.
          quantity: Math.max(0, Math.min(outstanding, asked)),
        };
      });

      const total = arriving.reduce((sum, entry) => sum + entry.quantity, 0);
      if (total === 0) {
        return { data: { received: false, reason: "nothing_to_receive" } };
      }

      const warehouseId = state.warehouses[0]?.id ?? "wh-1";
      const receivedAt = new Date().toISOString();
      const value = arriving.reduce(
        (sum, entry) => sum + entry.quantity * entry.line.cost,
        0
      );

      const items = order.items.map((line) => {
        const entry = arriving.find((item) => item.line === line);
        return entry
          ? { ...line, received: line.received + entry.quantity }
          : line;
      });
      const isComplete = items.every((line) => line.received >= line.quantity);

      state = {
        ...state,
        purchaseOrders: state.purchaseOrders.map((item) =>
          item.id === id
            ? { ...item, items, status: isComplete ? "received" : "partial" }
            : item
        ),
        products: state.products.map((product) => {
          const entry = arriving.find(
            (item) => item.line.productId === product.id
          );
          if (!entry) {
            return product;
          }
          // Stock arrives against the size that was ordered; a product sold
          // in sizes keeps its total as the sum of them.
          if (product.variants) {
            return withVariantStock({
              ...product,
              variants: product.variants.map((variant) =>
                variant.id === entry.line.variantId
                  ? { ...variant, stock: variant.stock + entry.quantity }
                  : variant
              ),
            });
          }
          return { ...product, stock: product.stock + entry.quantity };
        }),
        movements: [
          ...arriving
            .filter((entry) => entry.quantity > 0)
            .map((entry, index) => ({
              id: `${newId("mv")}-${index}`,
              productId: entry.line.productId,
              productName: entry.line.name,
              warehouseId,
              type: "in" as const,
              quantity: entry.quantity,
              reference: order.number,
              createdAt: receivedAt,
            })),
          ...state.movements,
        ],
        // Stock arriving on supplier terms is inventory bought on credit, so
        // it belongs in the books as well as on the shelf.
        journal: [
          {
            id: newId("je"),
            date: receivedAt,
            reference: order.number,
            memo: `Stock received from ${order.supplierName}`,
            lines: [
              { accountId: "acc-stock", debit: value, credit: 0 },
              { accountId: "acc-ap", debit: 0, credit: value },
            ],
          },
          ...state.journal,
        ],
      };
      persist();
      return {
        data: {
          received: true,
          order: state.purchaseOrders.find((item) => item.id === id),
        },
      };
    }

    case "boardings.updateStatus": {
      const id = String(body.id ?? "");
      const status = String(body.status ?? "") as Boarding["status"];
      state = {
        ...state,
        boardings: state.boardings.map((boarding) =>
          boarding.id === id ? { ...boarding, status } : boarding
        ),
      };
      persist();
      return { data: state.boardings.find((boarding) => boarding.id === id) };
    }

    case "invoices.list":
      return { data: state.invoices.map(priceInvoice) };

    case "invoices.info": {
      const invoice = state.invoices.find((item) => item.id === body.id);
      return { data: invoice ? priceInvoice(invoice) : null };
    }

    case "invoices.create": {
      const items = (body.items ?? []) as InvoiceItem[];
      const customerName = String(body.customerName ?? "").trim();

      if (!customerName || items.length === 0) {
        return { data: { created: false, reason: "missing_details" } };
      }

      const customer = state.customers.find(
        (item) => item.name === customerName
      );
      const issueDate = String(body.issueDate ?? new Date().toISOString());
      const invoice: Invoice = {
        id: newId("inv"),
        number: `INV-${5001 + state.invoices.length}`,
        customerId: customer?.id ?? "walk-in",
        customerName,
        issueDate,
        dueDate: String(body.dueDate ?? daysFromNow(14)),
        items,
        taxRate: Number(body.taxRate ?? 0.11),
        notes: String(body.notes ?? ""),
        payments: [],
        isVoid: false,
      };

      // Issuing an invoice earns the income and creates the debt; the cash
      // only arrives when it is paid, so those are two separate entries.
      const priced = priceInvoice(invoice);
      state = {
        ...state,
        invoices: [invoice, ...state.invoices],
        journal: [
          {
            id: newId("je"),
            date: issueDate,
            reference: invoice.number,
            memo: `Invoice to ${customerName}`,
            lines: [
              { accountId: "acc-ar", debit: priced.total, credit: 0 },
              { accountId: "acc-sales", debit: 0, credit: priced.total },
            ],
          },
          ...state.journal,
        ],
      };
      persist();
      return { data: { created: true, invoice: priced } };
    }

    case "invoices.recordPayment": {
      const id = String(body.id ?? "");
      const amount = Number(body.amount ?? 0);
      const method = body.method === "bank" ? "bank" : "cash";
      const invoice = state.invoices.find((item) => item.id === id);

      if (!invoice) {
        return { data: { recorded: false, reason: "not_found" } };
      }
      if (invoice.isVoid) {
        return { data: { recorded: false, reason: "void" } };
      }

      const priced = priceInvoice(invoice);
      if (amount <= 0) {
        return { data: { recorded: false, reason: "bad_amount" } };
      }
      if (amount > priced.due) {
        // Taking more than is owed would leave the ledger claiming money the
        // invoice cannot account for.
        return {
          data: { recorded: false, reason: "overpay", due: priced.due },
        };
      }

      const date = new Date().toISOString();
      const payment: InvoicePayment = {
        id: newId("pay"),
        date,
        amount,
        method,
        reference: String(body.reference ?? ""),
      };

      state = {
        ...state,
        invoices: state.invoices.map((item) =>
          item.id === id
            ? { ...item, payments: [...item.payments, payment] }
            : item
        ),
        journal: [
          {
            id: newId("je"),
            date,
            reference: invoice.number,
            memo: `Payment from ${invoice.customerName}`,
            lines: [
              {
                accountId: method === "bank" ? "acc-bank" : "acc-cash",
                debit: amount,
                credit: 0,
              },
              { accountId: "acc-ar", debit: 0, credit: amount },
            ],
          },
          ...state.journal,
        ],
      };
      persist();
      return {
        data: {
          recorded: true,
          invoice: priceInvoice(
            state.invoices.find((item) => item.id === id) as Invoice
          ),
        },
      };
    }

    case "invoices.void": {
      const id = String(body.id ?? "");
      const invoice = state.invoices.find((item) => item.id === id);

      if (!invoice) {
        return { data: { voided: false, reason: "not_found" } };
      }
      if (invoice.payments.length > 0) {
        // Money has already changed hands against it, so voiding would strand
        // that payment; it has to be refunded first.
        return { data: { voided: false, reason: "has_payments" } };
      }

      const priced = priceInvoice(invoice);
      const date = new Date().toISOString();
      state = {
        ...state,
        invoices: state.invoices.map((item) =>
          item.id === id ? { ...item, isVoid: true } : item
        ),
        journal: [
          {
            id: newId("je"),
            date,
            reference: invoice.number,
            memo: `Voided invoice for ${invoice.customerName}`,
            lines: [
              { accountId: "acc-sales", debit: priced.total, credit: 0 },
              { accountId: "acc-ar", debit: 0, credit: priced.total },
            ],
          },
          ...state.journal,
        ],
      };
      persist();
      return { data: { voided: true } };
    }

    case "boardings.create": {
      const petName = String(body.petName ?? "").trim();
      const customerName = String(body.customerName ?? "").trim();
      const checkIn = String(body.checkIn ?? "");
      const checkOut = String(body.checkOut ?? "");

      if (!petName || !customerName || !checkIn || !checkOut) {
        return { data: { created: false, reason: "missing_details" } };
      }

      const from = new Date(checkIn).getTime();
      const to = new Date(checkOut).getTime();

      if (Number.isNaN(from) || Number.isNaN(to) || to <= from) {
        return { data: { created: false, reason: "bad_dates" } };
      }

      // The front desk picks the room, but it still has to be free for the
      // nights being booked – the same rule the public form goes through.
      const requested = String(body.roomId ?? "");
      const rooms = roomOccupancy(from, to);
      const room = requested
        ? rooms.find((item) => item.id === requested && !item.isFull)
        : rooms.find((item) => !item.isFull);

      if (!room) {
        return { data: { created: false, reason: "no_room" } };
      }
      // Nobody can be looked after on a day the branch is shut.
      if (closuresBetween(room.branch, from, to).length > 0) {
        return { data: { created: false, reason: "closed" } };
      }

      const customer = state.customers.find(
        (item) => item.name === customerName
      );
      const boarding: Boarding = {
        id: newId("bd"),
        code: `BRD-${1044 + state.boardings.length}`,
        customerId: customer?.id ?? "walk-in",
        customerName,
        petName,
        roomId: room.id,
        roomName: room.name,
        branch: room.branch,
        checkIn,
        checkOut,
        status: "booked",
        ratePerNight: Number(body.ratePerNight ?? RATES[room.type] ?? 150000),
      };

      state = { ...state, boardings: [...state.boardings, boarding] };
      persist();
      return { data: { created: true, boarding } };
    }

    case "products.adjustStock": {
      const id = String(body.id ?? "");
      const delta = Number(body.delta ?? 0);
      state = {
        ...state,
        products: state.products.map((product) =>
          product.id === id
            ? { ...product, stock: Math.max(0, product.stock + delta) }
            : product
        ),
      };
      persist();
      return { data: state.products.find((product) => product.id === id) };
    }

    default:
      return undefined;
  }
}
