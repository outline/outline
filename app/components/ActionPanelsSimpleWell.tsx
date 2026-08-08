/**
 * Tailwind UI – action panels: simple well.
 *
 * @returns the rendered component.
 */
export function ActionPanelsSimpleWell() {
  return (
    <div className="bg-gray-50 sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-base font-semibold leading-6 text-gray-900">
          Need more bandwidth?
        </h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
            Voluptatibus praesentium tenetur pariatur.
          </p>
        </div>
        <div className="mt-5">
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Contact sales
          </button>
        </div>
      </div>
    </div>
  );
}
