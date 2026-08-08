import { create } from "zustand";
import type {
  PetStoreBoarding,
  PetStoreCustomer,
  PetStoreOrder,
  PetStoreProduct,
  PetStoreRoom,
  PetStoreSupplier,
  PetStoreWarehouse,
  PetStoreBatch,
  PetStoreMovement,
  PetStorePurchaseOrder,
} from "../../src/mocks/petstore";

/** A room with the guests currently occupying it. */
export type PetStoreRoomOccupancy = PetStoreRoom & {
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
export type PetStoreCartLine = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};
import { client } from "~/utils/ApiClient";

/** The figures shown across the top of the pet store dashboard. */
export interface PetStoreDashboard {
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

interface PetStoreState {
  dashboard?: PetStoreDashboard;
  products: PetStoreProduct[];
  customers: PetStoreCustomer[];
  boardings: PetStoreBoarding[];
  rooms: PetStoreRoomOccupancy[];
  orders: PetStoreOrder[];
  suppliers: PetStoreSupplier[];
  warehouses: PetStoreWarehouse[];
  batches: PetStoreBatch[];
  movements: PetStoreMovement[];
  purchaseOrders: PetStorePurchaseOrder[];
  isLoading: boolean;
  error?: string;
  fetchAll: () => Promise<void>;
  setBoardingStatus: (
    id: string,
    status: PetStoreBoarding["status"]
  ) => Promise<void>;
  adjustStock: (id: string, delta: number) => Promise<void>;
  createOrder: (
    items: PetStoreCartLine[],
    customerName: string
  ) => Promise<PetStoreOrder>;
  markOrderPaid: (id: string) => Promise<void>;
  receivePurchaseOrder: (id: string) => Promise<void>;
}

/**
 * State for the pet store domains.
 *
 * Everything is loaded in one pass because the pages share the same figures –
 * the dashboard totals are derived from the same records the list pages show.
 */
export const usePetStore = create<PetStoreState>((set, get) => ({
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
      ] = await Promise.all([
        client.post("/petstore.dashboard"),
        client.post("/petstore.products.list"),
        client.post("/petstore.customers.list"),
        client.post("/petstore.boardings.list"),
        client.post("/petstore.rooms.list"),
        client.post("/petstore.orders.list"),
        client.post("/petstore.suppliers.list"),
        client.post("/petstore.warehouses.list"),
        client.post("/petstore.batches.list"),
        client.post("/petstore.movements.list"),
        client.post("/petstore.purchaseOrders.list"),
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

    await client.post("/petstore.boardings.updateStatus", { id, status });
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

    await client.post("/petstore.products.adjustStock", { id, delta });
    await get().fetchAll();
  },

  createOrder: async (items, customerName) => {
    const response = await client.post("/petstore.orders.create", {
      items,
      customerName,
    });
    await get().fetchAll();
    return response.data;
  },

  markOrderPaid: async (id) => {
    await client.post("/petstore.orders.markPaid", { id });
    await get().fetchAll();
  },

  receivePurchaseOrder: async (id) => {
    await client.post("/petstore.purchaseOrders.receive", { id });
    await get().fetchAll();
  },
}));
