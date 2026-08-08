import { usePetStore } from "~/stores/petstore";
import { PetStoreScene } from "./components/PetStoreScene";
import { formatCurrency, statusBadge } from "./format";

/**
 * Product catalogue with stock levels, flagging anything at or below its
 * reorder level.
 *
 * @returns the rendered products page.
 */
function PetStoreProducts() {
  const products = usePetStore((state) => state.products);
  const adjustStock = usePetStore((state) => state.adjustStock);

  return (
    <PetStoreScene
      title="Products"
      description="Catalogue, pricing and stock on hand."
    >
      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                "SKU",
                "Product",
                "Category",
                "Price",
                "Stock",
                "Status",
                "",
              ].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {products.map((product) => {
              const low = product.stock <= product.reorderLevel;

              return (
                <tr key={product.id}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {product.sku}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {product.name}
                    <span className="block text-xs font-normal text-gray-500">
                      {product.supplier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {product.category}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={
                        low
                          ? "font-semibold text-red-600"
                          : "font-medium text-gray-900"
                      }
                    >
                      {product.stock}
                    </span>
                    {low ? (
                      <span className="block text-xs text-red-600">
                        reorder at {product.reorderLevel}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={statusBadge(product.status)}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="isolate inline-flex rounded-md shadow-xs">
                      <button
                        type="button"
                        aria-label={`Decrease stock of ${product.name}`}
                        onClick={() => void adjustStock(product.id, -1)}
                        className="relative inline-flex items-center rounded-l-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        aria-label={`Increase stock of ${product.name}`}
                        onClick={() => void adjustStock(product.id, 1)}
                        className="relative -ml-px inline-flex items-center rounded-r-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      >
                        +
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {products.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">No products yet.</p>
        ) : null}
      </div>
    </PetStoreScene>
  );
}

export default PetStoreProducts;
