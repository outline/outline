import { useEffect, useState } from "react";
import { client } from "~/utils/ApiClient";
import { BusinessLayout } from "./BusinessLayout";

/** A product on the public shopfront. */
interface FeaturedProduct {
  id: string;
  name: string;
  category: string;
  price: number;
}

const money = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

/**
 * The public shopfront.
 *
 * Only active products with stock are published, so nothing is advertised
 * that cannot be sold.
 *
 * @returns the rendered featured products page.
 */
function Featured() {
  const [products, setProducts] = useState<FeaturedProduct[]>([]);

  useEffect(() => {
    let cancelled = false;
    void client.post("/public.featured").then((response) => {
      if (!cancelled) {
        setProducts(response.data ?? []);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <BusinessLayout current="featured">
      <h2 className="text-lg font-semibold text-gray-900">In the shop</h2>
      <p className="mt-1 text-sm text-gray-600">
        Food, toys and grooming, ready to collect in store.
      </p>

      <ul
        role="list"
        className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {products.map((product) => (
          <li
            key={product.id}
            className="rounded-lg border border-gray-200 p-4"
          >
            <p className="text-sm font-medium text-gray-900">{product.name}</p>
            <p className="mt-1 text-xs text-gray-500">{product.category}</p>
            <p className="mt-3 text-sm font-semibold text-gray-900">
              {money(product.price)}
            </p>
          </li>
        ))}
        {products.length === 0 ? (
          <li className="text-sm text-gray-500">Nothing in stock right now.</li>
        ) : null}
      </ul>
    </BusinessLayout>
  );
}

export default Featured;
