import { usePetStore } from "~/stores/petstore";
import { PetStoreScene } from "./components/PetStoreScene";

/**
 * Customer directory, with the pets registered against each owner.
 *
 * @returns the rendered customers page.
 */
function PetStoreCustomers() {
  const customers = usePetStore((state) => state.customers);

  return (
    <PetStoreScene
      title="Customers"
      description="Owners, their pets and loyalty standing."
    >
      <ul
        role="list"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {customers.map((customer) => (
          <li
            key={customer.id}
            className="col-span-1 divide-y divide-gray-200 rounded-lg bg-white shadow-sm ring-1 ring-gray-200"
          >
            <div className="flex w-full items-center justify-between space-x-6 p-6">
              <div className="flex-1 truncate">
                <div className="flex items-center space-x-3">
                  <h3 className="truncate text-sm font-medium text-gray-900">
                    {customer.name}
                  </h3>
                  <span className="inline-flex shrink-0 items-center rounded-full bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                    {customer.loyaltyPoints} pts
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-gray-500">
                  {customer.email}
                </p>
                <p className="mt-1 truncate text-sm text-gray-500">
                  {customer.phone}
                </p>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Pets
              </p>
              <ul className="mt-2 space-y-1">
                {customer.pets.map((pet) => (
                  <li key={pet.id} className="text-sm text-gray-700">
                    <span className="font-medium text-gray-900">
                      {pet.name}
                    </span>{" "}
                    · {pet.species} · {pet.breed}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
      {customers.length === 0 ? (
        <p className="text-sm text-gray-500">No customers yet.</p>
      ) : null}
    </PetStoreScene>
  );
}

export default PetStoreCustomers;
