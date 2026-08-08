/**
 * Tailwind UI – badges: with border and dot on dark.
 *
 * @returns the rendered component.
 */
export function BadgesWithBorderAndDotOnDark() {
  return (
    <>
      <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium text-white ring-1 ring-inset ring-gray-800">
        <svg
          className="h-1.5 w-1.5 fill-red-400"
          viewBox="0 0 6 6"
          aria-hidden="true"
        >
          <circle cx={3} cy={3} r={3} />
        </svg>
        Badge
      </span>
      <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium text-white ring-1 ring-inset ring-gray-800">
        <svg
          className="h-1.5 w-1.5 fill-yellow-400"
          viewBox="0 0 6 6"
          aria-hidden="true"
        >
          <circle cx={3} cy={3} r={3} />
        </svg>
        Badge
      </span>
      <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium text-white ring-1 ring-inset ring-gray-800">
        <svg
          className="h-1.5 w-1.5 fill-green-400"
          viewBox="0 0 6 6"
          aria-hidden="true"
        >
          <circle cx={3} cy={3} r={3} />
        </svg>
        Badge
      </span>
      <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium text-white ring-1 ring-inset ring-gray-800">
        <svg
          className="h-1.5 w-1.5 fill-blue-400"
          viewBox="0 0 6 6"
          aria-hidden="true"
        >
          <circle cx={3} cy={3} r={3} />
        </svg>
        Badge
      </span>
      <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium text-white ring-1 ring-inset ring-gray-800">
        <svg
          className="h-1.5 w-1.5 fill-indigo-400"
          viewBox="0 0 6 6"
          aria-hidden="true"
        >
          <circle cx={3} cy={3} r={3} />
        </svg>
        Badge
      </span>
      <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium text-white ring-1 ring-inset ring-gray-800">
        <svg
          className="h-1.5 w-1.5 fill-purple-400"
          viewBox="0 0 6 6"
          aria-hidden="true"
        >
          <circle cx={3} cy={3} r={3} />
        </svg>
        Badge
      </span>
      <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium text-white ring-1 ring-inset ring-gray-800">
        <svg
          className="h-1.5 w-1.5 fill-pink-400"
          viewBox="0 0 6 6"
          aria-hidden="true"
        >
          <circle cx={3} cy={3} r={3} />
        </svg>
        Badge
      </span>
    </>
  );
}
