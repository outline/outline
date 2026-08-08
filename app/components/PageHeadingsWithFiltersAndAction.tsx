import { PlusSmallIcon } from "@heroicons/react/20/solid";

/**
 * Tailwind UI – page headings: with filters and action.
 *
 * @returns the rendered component.
 */
export function PageHeadingsWithFiltersAndAction() {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-6 px-4 sm:flex-nowrap sm:px-6 lg:px-8">
        <h1 className="text-base font-semibold leading-7 text-gray-900">
          Cashflow
        </h1>
        <div className="order-last flex w-full gap-x-8 text-sm font-semibold leading-6 sm:order-none sm:w-auto sm:border-l sm:border-gray-200 sm:pl-6 sm:leading-7">
          <a href="#" className="text-indigo-600">
            Last 7 days
          </a>
          <a href="#" className="text-gray-700">
            Last 30 days
          </a>
          <a href="#" className="text-gray-700">
            All-time
          </a>
        </div>
        <a
          href="#"
          className="ml-auto flex items-center gap-x-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <PlusSmallIcon className="-ml-1.5 h-5 w-5" aria-hidden="true" />
          New invoice
        </a>
      </div>
    </div>
  );
}
