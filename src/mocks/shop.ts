/**
 * Seed data and request handlers for the shop domains.
 *
 * Mirrors the feature surface of the reference pet-store-app so the scenes can
 * be built against the same shapes, served from the existing in-browser mock
 * rather than a backend.
 */

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
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  pets: { id: string; name: string; species: string; breed: string }[];
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
  total: number;
  paidAt: string | null;
  status: "draft" | "paid" | "refunded";
  items: { productId: string; name: string; quantity: number; price: number }[];
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

export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  status: "draft" | "ordered" | "received" | "cancelled";
  expectedAt: string;
  items: { productId: string; name: string; quantity: number; cost: number }[];
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  manager: string;
}

export interface Staff {
  id: string;
  name: string;
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
  staff: Staff[];
  accounts: Account[];
  journal: JournalEntry[];
  expenses: Expense[];
  shifts: Shift[];
  grooming: Grooming[];
  loyalty: LoyaltyMovement[];
}

const STORAGE_KEY = "shop_db_v3";

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
      customerName: "Sinta Wijaya",
      channel: "pos",
      total: 353000,
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
      quantity: 2,
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
      role: "manager",
      branch: "Kemang",
      phone: "+62 812-1111-2222",
      status: "active",
      commissionRate: 5,
    },
    {
      id: "stf-2",
      name: "Dimas Aditya",
      role: "groomer",
      branch: "Kemang",
      phone: "+62 815-7777-8888",
      status: "active",
      commissionRate: 12,
    },
    {
      id: "stf-3",
      name: "Putri Ayu",
      role: "cashier",
      branch: "Kemang",
      phone: "+62 816-9999-0000",
      status: "on_leave",
      commissionRate: 0,
    },
    {
      id: "stf-4",
      name: "Bayu Pratama",
      role: "manager",
      branch: "Bintaro",
      phone: "+62 813-3333-4444",
      status: "active",
      commissionRate: 5,
    },
    {
      id: "stf-5",
      name: "Rizky Hakim",
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
      return JSON.parse(saved);
    }
  } catch (_err) {
    // fall through to the seed
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

let state = loadState();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_err) {
    // storage unavailable; keep the in-memory copy
  }
}

/**
 * Whether a boarding occupies its room right now.
 *
 * @param boarding the boarding to test.
 * @returns true when it is checked in, or booked and within its date range.
 */
function isOccupyingToday(boarding: Boarding): boolean {
  if (boarding.status === "checked_out" || boarding.status === "cancelled") {
    return false;
  }
  const now = Date.now();
  return (
    new Date(boarding.checkIn).getTime() <= now &&
    new Date(boarding.checkOut).getTime() >= now
  );
}

/**
 * Occupancy per room, derived from the boardings rather than stored.
 *
 * @returns each room with the guests currently in it.
 */
export function roomOccupancy() {
  return state.rooms.map((room) => {
    const guests = state.boardings.filter(
      (boarding) => boarding.roomId === room.id && isOccupyingToday(boarding)
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
  const revenue = paid.reduce((total, order) => total + order.total, 0);
  const branchCount = Math.max(1, state.branches.length);

  return state.staff
    .filter((member) => member.commissionRate > 0)
    .map((member) => {
      // Sales are not attributed to a till operator yet, so revenue is split
      // evenly across branches before the rate is applied.
      const base = revenue / branchCount;
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
  const activeBoardings = state.boardings.filter(
    (boarding) => boarding.status === "checked_in"
  );
  const occupancy = roomOccupancy();
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
export function handleShopRequest(
  action: string,
  body: Record<string, unknown>
): { data: unknown } | undefined {
  switch (action) {
    case "dashboard":
      return { data: dashboard() };

    case "products.list":
      return { data: state.products };

    case "customers.list":
      return { data: state.customers };

    case "boardings.list":
      return { data: state.boardings };

    case "rooms.list":
      return { data: roomOccupancy() };

    case "orders.create": {
      const items = (body.items ?? []) as Order["items"];
      const total = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const order: Order = {
        id: `ord-${Date.now()}`,
        number: `INV-${2042 + state.orders.length}`,
        customerName: String(body.customerName ?? "Walk-in"),
        channel: "pos",
        total,
        paidAt: new Date().toISOString(),
        status: "paid",
        items,
      };

      // Selling stock reduces it, so the catalogue and dashboard stay in step.
      state = {
        ...state,
        orders: [order, ...state.orders],
        products: state.products.map((product) => {
          const sold = items.find((item) => item.productId === product.id);
          return sold
            ? { ...product, stock: Math.max(0, product.stock - sold.quantity) }
            : product;
        }),
      };
      persist();
      return { data: order };
    }

    case "orders.list":
      return { data: state.orders };

    case "orders.info":
      return {
        data: state.orders.find((order) => order.id === body.id) ?? null,
      };

    case "orders.markPaid": {
      const id = String(body.id ?? "");
      state = {
        ...state,
        orders: state.orders.map((order) =>
          order.id === id
            ? { ...order, status: "paid", paidAt: new Date().toISOString() }
            : order
        ),
      };
      persist();
      return { data: state.orders.find((order) => order.id === id) };
    }

    case "branches.list":
      return { data: state.branches };

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
        id: `rm-${Date.now()}`,
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

    case "shifts.list":
      return { data: state.shifts };

    case "accounting.trialBalance":
      return { data: trialBalance() };

    case "accounting.commissions":
      return { data: commissions() };

    case "expenses.create": {
      const amount = Number(body.amount ?? 0);
      const category = String(body.category ?? "Supplies");
      const paidFrom = String(body.paidFrom ?? "acc-cash");
      const date = new Date().toISOString();
      const id = `exp-${Date.now()}`;

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
            id: `je-${Date.now()}`,
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
        const earned = Math.round(appointment.price / 1000);

        state = {
          ...state,
          orders: [
            {
              id: `ord-${Date.now()}`,
              number: `INV-${2042 + state.orders.length}`,
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
              id: `loy-${Date.now()}`,
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
            id: `loy-${Date.now()}`,
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

    case "purchaseOrders.receive": {
      const id = String(body.id ?? "");
      const order = state.purchaseOrders.find((item) => item.id === id);
      if (!order) {
        return { data: null };
      }

      // Receiving a purchase order books the stock in and records a movement
      // against the first warehouse, mirroring the reference app.
      const warehouseId = state.warehouses[0]?.id ?? "wh-1";
      const receivedAt = new Date().toISOString();

      state = {
        ...state,
        purchaseOrders: state.purchaseOrders.map((item) =>
          item.id === id ? { ...item, status: "received" } : item
        ),
        products: state.products.map((product) => {
          const line = order.items.find(
            (item) => item.productId === product.id
          );
          return line
            ? { ...product, stock: product.stock + line.quantity }
            : product;
        }),
        movements: [
          ...order.items.map((line, index) => ({
            id: `mv-${Date.now()}-${index}`,
            productId: line.productId,
            productName: line.name,
            warehouseId,
            type: "in" as const,
            quantity: line.quantity,
            reference: order.number,
            createdAt: receivedAt,
          })),
          ...state.movements,
        ],
      };
      persist();
      return { data: state.purchaseOrders.find((item) => item.id === id) };
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
