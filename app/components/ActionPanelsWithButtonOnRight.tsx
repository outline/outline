/**
 * Tailwind UI – action panels: with button on right.
 *
 * @returns the rendered component.
 */
export function ActionPanelsWithButtonOnRight() {
  return (
    <div className="bg-white shadow-sm sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-base font-semibold leading-6 text-gray-900">
          Manage subscription
        </h3>
        <div className="mt-2 sm:flex sm:items-start sm:justify-between">
          <div className="max-w-xl text-sm text-gray-500">
            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit.
              Recusandae voluptatibus corrupti atque repudiandae nam.
            </p>
          </div>
          <div className="mt-5 sm:ml-6 sm:mt-0 sm:flex sm:shrink-0 sm:items-center">
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              Change plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
