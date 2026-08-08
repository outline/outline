import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";

/**
 * Tailwind UI – page headings: with actions and breadcrumbs.
 *
 * @returns the rendered component.
 */
export function PageHeadingsWithActionsAndBreadcrumbs() {
  return (
    <div>
      <div>
        <nav className="sm:hidden" aria-label="Back">
          <a
            href="#"
            className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ChevronLeftIcon
              className="-ml-1 mr-1 h-5 w-5 shrink-0 text-gray-400"
              aria-hidden="true"
            />
            Back
          </a>
        </nav>
        <nav className="hidden sm:flex" aria-label="Breadcrumb">
          <ol role="list" className="flex items-center space-x-4">
            <li>
              <div className="flex">
                <a
                  href="#"
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Jobs
                </a>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRightIcon
                  className="h-5 w-5 shrink-0 text-gray-400"
                  aria-hidden="true"
                />
                <a
                  href="#"
                  className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Engineering
                </a>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRightIcon
                  className="h-5 w-5 shrink-0 text-gray-400"
                  aria-hidden="true"
                />
                <a
                  href="#"
                  aria-current="page"
                  className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Back End Developer
                </a>
              </div>
            </li>
          </ol>
        </nav>
      </div>
      <div className="mt-2 md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Back End Developer
          </h2>
        </div>
        <div className="mt-4 flex shrink-0 md:ml-4 md:mt-0">
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            type="button"
            className="ml-3 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}
