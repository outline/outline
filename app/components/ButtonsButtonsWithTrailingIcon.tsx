import { CheckCircleIcon } from "@heroicons/react/20/solid";

/**
 * Tailwind UI – buttons: buttons with trailing icon.
 *
 * @returns the rendered component.
 */
export function ButtonsButtonsWithTrailingIcon() {
  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Button text
        <CheckCircleIcon className="-mr-0.5 h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Button text
        <CheckCircleIcon className="-mr-0.5 h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Button text
        <CheckCircleIcon className="-mr-0.5 h-5 w-5" aria-hidden="true" />
      </button>
    </>
  );
}
