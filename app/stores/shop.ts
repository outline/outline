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
}));
