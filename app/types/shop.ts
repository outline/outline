/** One size or flavour of a product, with its own code, price and stock. */
export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

/** A sellable catalogue product. */
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

/** A customer and their registered pets. */
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  pets: Pet[];
  loyaltyPoints: number;
  joinedAt: string;
}

/** A pet boarding stay shown in the frontend. */
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

/** A room available for boarding. */
export interface Room {
  id: string;
  name: string;
  branch: string;
  capacity: number;
  type: "standard" | "deluxe" | "suite";
}

/** A point-of-sale or online order. */
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
    /** Identifier of the order line in the Pet Store API. */
    orderItemId?: string;
    productId: string;
    /** Set when the line was a particular size of the product. */
    variantId?: string;
    name: string;
    quantity: number;
    price: number;
  }[];
}

/** A supplier used for stock purchasing. */
export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  terms: string;
}

/** A stock storage location. */
export interface Warehouse {
  id: string;
  name: string;
  branch: string;
}

/** A quantity of stock sharing one lot and expiry date. */
export interface Batch {
  id: string;
  productId: string;
  productName: string;
  warehouseId: string;
  lot: string;
  quantity: number;
  expiresAt: string;
}

/** An inventory movement recorded by the backend. */
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
  /** Identifier of the purchase-order line in the Pet Store API. */
  poItemId?: string;
  productId: string;
  /** Set when a particular size was ordered. */
  variantId?: string;
  name: string;
  quantity: number;
  cost: number;
  /** How many of the ordered quantity have actually arrived. */
  received: number;
}

/** A purchase order sent to a supplier. */
export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  status: "draft" | "ordered" | "partial" | "received" | "cancelled";
  expectedAt: string;
  items: PurchaseOrderItem[];
}

/** A physical business branch. */
export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  manager: string;
}

/** A staff member and their role in the business. */
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

/** An account in the business chart of accounts. */
export interface Account {
  id: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
}

/** A debit or credit line in a journal entry. */
export interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
}

/** A balanced accounting journal entry. */
export interface JournalEntry {
  id: string;
  date: string;
  reference: string;
  memo: string;
  lines: JournalLine[];
}

/** A business expense paid from an account. */
export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paidFrom: string;
}

/** A staff attendance shift. */
export interface Shift {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
}

/** A scheduled grooming appointment. */
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

/** A loyalty point movement for a customer. */
export interface LoyaltyMovement {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  points: number;
  reason: string;
}

/** A reusable WhatsApp message template. */
export interface WhatsappTemplate {
  id: string;
  name: string;
  category: "reminder" | "marketing" | "receipt";
  body: string;
  status: "approved" | "pending";
}

/** A WhatsApp delivery recorded by the backend. */
export interface WhatsappMessage {
  id: string;
  templateId: string;
  templateName: string;
  to: string;
  customerName: string;
  sentAt: string;
  status: "sent" | "delivered" | "read" | "failed";
}

/** The business subscription and its limits. */
export interface Subscription {
  plan: "free" | "pro" | "business";
  price: number;
  interval: "month" | "year";
  renewsAt: string;
  status: "active" | "past_due";
  limits: { staff: number; branches: number; boardingsPerMonth: number };
}

/** An invoice issued for the subscription. */
export interface BillingInvoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: "paid" | "open";
}

/** A priced line on a customer invoice. */
export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

/** A payment recorded against a customer invoice. */
export interface InvoicePayment {
  id: string;
  date: string;
  amount: number;
  method: "cash" | "bank";
  reference: string;
}

/** A customer invoice and its payment history. */
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

/** A public service configured for the customer portal. */
export interface PortalService {
  id: string;
  name: string;
  description: string;
  category: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
}

/** A customer review shown on the public portal. */
export interface PortalReview {
  id: string;
  customerName: string;
  rating: number;
  body: string;
  createdAt: string;
}
