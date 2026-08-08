import { useMemo, useState } from "react";
import type { CartLine } from "~/stores/shop";
import { useShop } from "~/stores/shop";
import { AppPage } from "~/components/AppPage";
import { formatCurrency } from "~/utils/format";

/**
 * Point of sale: pick products into a ticket and take payment.
 *
 * Completing a sale writes an order and decrements stock, so the catalogue,
 * dashboard and order history all move together.
 *
 * @returns the rendered till.
 */
function Pos() {
  const products = useShop((state) => state.products);
  const customers = useShop((state) => state.customers);
  const createOrder = useShop((state) => state.createOrder);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("Walk-in");
  const [receipt, setReceipt] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const categories = useMemo(
    () => ["All", ...new Set(products.map((product) => product.category))],
    [products]
  );

  const visible = useMemo(
    () =>
      products.filter((product) => {
        const matchesCategory =
          category === "All" || product.category === category;
        const term = query.trim().toLowerCase();
        const matchesQuery =
          !term ||
          product.name.toLowerCase().includes(term) ||
          product.sku.toLowerCase().includes(term);
        return matchesCategory && matchesQuery;
      }),
    [products, category, query]
  );

  const total = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);

  const addToCart = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product || product.stock === 0) {
      return;
    }

    setReceipt(undefined);
    setCart((lines) => {
      const existing = lines.find((line) => line.productId === productId);
      if (existing) {
        // Never sell more than is on the shelf.
        if (existing.quantity >= product.stock) {
          return lines;
        }
        return lines.map((line) =>
          line.productId === productId
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }
      return [
        ...lines,
        {
          productId,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  };

  const setQuantity = (productId: string, quantity: number) => {
    setCart((lines) =>
      quantity <= 0
        ? lines.filter((line) => line.productId !== productId)
        : lines.map((line) =>
            line.productId === productId ? { ...line, quantity } : line
          )
    );
  };

  const handleCheckout = async () => {
    if (!cart.length) {
      return;
    }
    setIsSaving(true);
    try {
      const order = await createOrder(cart, customerName);
      setCart([]);
      setReceipt(order.number);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppPage
      title="Point of sale"
      description="Ring up a sale; stock and takings update as you go."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or SKU"
              aria-label="Search products"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Filter by category"
              className="block rounded-md border-0 py-1.5 pr-10 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
            >
              {categories.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <ul
            role="list"
            className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {visible.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => addToCart(product.id)}
                  disabled={product.stock === 0}
                  className="flex h-full w-full flex-col items-start rounded-lg bg-white p-4 text-left shadow-sm ring-1 ring-gray-200 hover:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {product.name}
                  </span>
                  <span className="mt-1 font-mono text-xs text-gray-500">
                    {product.sku}
                  </span>
                  <span className="mt-3 text-sm font-semibold text-gray-900">
                    {formatCurrency(product.price)}
                  </span>
                  <span
                    className={`mt-1 text-xs ${
                      product.stock === 0 ? "text-red-600" : "text-gray-500"
                    }`}
                  >
                    {product.stock === 0
                      ? "Out of stock"
                      : `${product.stock} in stock`}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {visible.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">
              Nothing matches that search.
            </p>
          ) : null}
        </div>

        <aside className="lg:col-span-1">
          <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Ticket</h2>

            <label
              htmlFor="pos-customer"
              className="mt-4 block text-xs font-medium text-gray-700"
            >
              Customer
            </label>
            <select
              id="pos-customer"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
            >
              <option>Walk-in</option>
              {customers.map((customer) => (
                <option key={customer.id}>{customer.name}</option>
              ))}
            </select>

            <ul role="list" className="mt-4 divide-y divide-gray-100">
              {cart.map((line) => (
                <li key={line.productId} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {line.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(line.price)} each
                      </p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(line.price * line.quantity)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Decrease ${line.name}`}
                      onClick={() =>
                        setQuantity(line.productId, line.quantity - 1)
                      }
                      className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      −
                    </button>
                    <span className="text-sm text-gray-900">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase ${line.name}`}
                      onClick={() => addToCart(line.productId)}
                      className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
              {cart.length === 0 ? (
                <li className="py-6 text-sm text-gray-500">
                  Pick a product to start a ticket.
                </li>
              ) : null}
            </ul>

            <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
              <span className="text-sm font-medium text-gray-500">Total</span>
              <span
                data-testid="pos-total"
                className="text-xl font-semibold text-gray-900"
              >
                {formatCurrency(total)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => void handleCheckout()}
              disabled={cart.length === 0 || isSaving}
              className="mt-4 w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Taking payment…" : "Charge"}
            </button>

            {cart.length > 0 ? (
              <button
                type="button"
                onClick={() => setCart([])}
                className="mt-2 w-full rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Clear ticket
              </button>
            ) : null}

            {receipt ? (
              <p
                data-testid="pos-receipt"
                className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-800"
              >
                Paid — receipt {receipt}
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </AppPage>
  );
}

export default Pos;
