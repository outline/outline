import { BookmarkIcon } from "@heroicons/react/20/solid";

/**
 * Tailwind UI – button groups: with stat.
 *
 * @returns the rendered component.
 */
export function ButtonGroupsWithStat() {
  return (
    <span className="isolate inline-flex rounded-md shadow-xs">
      <button
        type="button"
        className="relative inline-flex items-center gap-x-1.5 rounded-l-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
      >
        <BookmarkIcon
          className="-ml-0.5 h-5 w-5 text-gray-400"
          aria-hidden="true"
        />
        Bookmark
      </button>
      <button
        type="button"
        className="relative -ml-px inline-flex items-center rounded-r-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
      >
        12k
      </button>
    </span>
  );
}
