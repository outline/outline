/**
 * Seed data and request handlers for the pet store domains.
 *
 * Mirrors the feature surface of the reference pet-store-app so the pages in
 * `app/scenes/PetStore` can be built against the same shapes, served from the
 * existing in-browser mock rather than a backend.
 */

export interface PetStoreProduct {
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

export interface PetStoreCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  pets: { id: string; name: string; species: string; breed: string }[];
  loyaltyPoints: number;
  joinedAt: string;
}

export interface PetStoreBoarding {
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

export interface PetStoreRoom {
  id: string;
  name: string;
  branch: string;
  capacity: number;
  type: "standard" | "deluxe" | "suite";
}

export interface PetStoreOrder {
  id: string;
  number: string;
  customerName: string;
  channel: "pos" | "online";
  total: number;
  paidAt: string | null;
  status: "draft" | "paid" | "refunded";
  items: { productId: string; name: string; quantity: number; price: number }[];
}

export interface PetStoreState {
  products: PetStoreProduct[];
  customers: PetStoreCustomer[];
  boardings: PetStoreBoarding[];
  rooms: PetStoreRoom[];
  orders: PetStoreOrder[];
}

const STORAGE_KEY = "outline_petstore_db_v2";

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString();

const seed: PetStoreState = {
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
};

/**
 * Loads the pet store data, seeding it on first use.
 *
 * @returns the persisted pet store state.
 */
function loadState(): PetStoreState {
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
function isOccupyingToday(boarding: PetStoreBoarding): boolean {
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
export function handlePetStoreRequest(
  action: string,
  body: Record<string, unknown>
): { data: unknown } | undefined {
  switch (action) {
    case "petstore.dashboard":
      return { data: dashboard() };

    case "petstore.products.list":
      return { data: state.products };

    case "petstore.customers.list":
      return { data: state.customers };

    case "petstore.boardings.list":
      return { data: state.boardings };

    case "petstore.rooms.list":
      return { data: roomOccupancy() };

    case "petstore.orders.create": {
      const items = (body.items ?? []) as PetStoreOrder["items"];
      const total = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const order: PetStoreOrder = {
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

    case "petstore.orders.list":
      return { data: state.orders };

    case "petstore.boardings.updateStatus": {
      const id = String(body.id ?? "");
      const status = String(body.status ?? "") as PetStoreBoarding["status"];
      state = {
        ...state,
        boardings: state.boardings.map((boarding) =>
          boarding.id === id ? { ...boarding, status } : boarding
        ),
      };
      persist();
      return { data: state.boardings.find((boarding) => boarding.id === id) };
    }

    case "petstore.products.adjustStock": {
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
