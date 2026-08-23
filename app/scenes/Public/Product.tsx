import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { client } from "~/utils/ApiClient";
import { BusinessLayout } from "./BusinessLayout";
/** A product as the public shopfront describes it. */
interface PublicProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  sku: string;
  inStock: boolean;
}
/** Formats rupiah for the public pages. */
const money = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
/**
 * One product on the public shopfront.
 *
 * An archived or sold-out product is not reachable here even by its address,
 * so nothing is advertised that cannot be sold.
 *
 * @returns the rendered product page.
 */
function Product() {
  const { businessSlug, productId } = useParams<{
    businessSlug: string;
    productId: string;
  }>();
  const [product, setProduct] = useState<PublicProduct | null | undefined>();
  useEffect(() => {
    let cancelled = false;
    void client
      .post("/public.product", { slug: businessSlug, id: productId })
      .then((response) => {
        if (!cancelled) {
          setProduct(response.data ?? null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [businessSlug, productId]);
  if (product === undefined) {
    return (
      <BusinessLayout current="featured">
        <p className="text-sm text-gray-500">Loading…</p>
      </BusinessLayout>
    );
  }
  if (product === null) {
    return (
      <BusinessLayout current="featured">
        <h2 className="text-lg font-semibold text-gray-900">
          We couldn&rsquo;t find that
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          It may have sold out or been taken off the shelf.
        </p>
        <Link
          to={`/p/${businessSlug}/featured`}
          className="mt-6 inline-block text-sm font-semibold text-indigo-600"
        >
          Back to the shop
        </Link>
      </BusinessLayout>
    );
  }
  return (
    <BusinessLayout current="featured">
      <p className="text-xs uppercase tracking-wide text-gray-500">
        {product.category}
      </p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
        {product.name}
      </h2>
      <p className="mt-4 text-xl font-semibold text-gray-900">
        {money(product.price)}
      </p>
      <p className="mt-2 text-sm text-gray-600">
        {product.inStock ? "In stock, ready to collect." : "Out of stock."}
      </p>
      <p className="mt-6 text-sm text-gray-500">Item code {product.sku}</p>

      <p className="mt-8 text-sm text-gray-600">
        Reserve it by calling the shop, or pick it up next time you visit.
      </p>

      <Link
        to={`/p/${businessSlug}/featured`}
        className="mt-8 inline-block text-sm font-semibold text-indigo-600"
      >
        Back to the shop
      </Link>
    </BusinessLayout>
  );
}
export default Product;
