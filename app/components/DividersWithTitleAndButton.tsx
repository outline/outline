import { PlusIcon } from "@heroicons/react/20/solid";

/**
 * Tailwind UI – dividers: with title and button.
 *
 * @returns the rendered component.
 */
export function DividersWithTitleAndButton() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-gray-300" />
      </div>
      <div className="relative flex items-center justify-between">
        <span className="bg-white pr-3 text-base font-semibold leading-6 text-gray-900">
          Projects
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-x-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          <PlusIcon
            className="-ml-1 -mr-0.5 h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
          <span>Button text</span>
        </button>
      </div>
    </div>
  );
}
