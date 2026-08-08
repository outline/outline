/**
 * Tailwind UI – badges: flat pill with dot.
 *
 * @returns the rendered component.
 */
export function BadgesFlatPillWithDot() {
  return (
    <>
      <span className="inline-flex items-center gap-x-1.5 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
        <svg
          className="h-1.5 w-1.5 fill-gray-400"
          viewBox="0 0 6 6"
          aria-hidden="true"
        >
          <circle cx={3} cy={3} r={3} />
        </svg>
        Badge
      </span>
      <span className="inline-flex items-center gap-x-1.5 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
        <svg
          className="h-1.5 w-1.5 fill-red-500"
          viewBox="0 0 6 6"
          aria-hidden="true"
        >
          <circle cx={3} cy={3} r={3} />
        </svg>
        Badge
      </span>
      <span className="inline-flex items-center gap-x-1.5 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
        <svg
          className="h-1.5 w-1.5 fill-yellow-500"
          viewBox="0 0 6 6"
          aria-hidden="true"
        >
          <circle cx={3} cy={3} r={3} />
        </svg>
        Badge
      </span>
      <span className="inline-flex items-center gap-x-1.5 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
        <svg
          className="h-1.5 w-1.5 fill-green-500"
          viewBox="0 0 6 6"
          aria-hidden="true"
        >
          <circle cx={3} cy={3} r={3} />
        </svg>
        Badge
      </span>
      <span className="inline-flex items-center gap-x-1.5 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
        <svg
          className="h-1.5 w-1.5 fill-blue-500"
          viewBox="0 0 6 6"
          aria-hidden="true"
        >
          <circle cx={3} cy={3} r={3} />
        </svg>
        Badge
      </span>
      <span className="inline-flex items-center gap-x-1.5 rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
        <svg
          className="h-1.5 w-1.5 fill-indigo-500"
          viewBox="0 0 6 6"
          aria-hidden="true"
        >
          <circle cx={3} cy={3} r={3} />
        </svg>
        Badge
      </span>
      <span className="inline-flex items-center gap-x-1.5 rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
        <svg
          className="h-1.5 w-1.5 fill-purple-500"
          viewBox="0 0 6 6"
          aria-hidden="true"
        >
          <circle cx={3} cy={3} r={3} />
        </svg>
        Badge
      </span>
      <span className="inline-flex items-center gap-x-1.5 rounded-full bg-pink-100 px-2 py-1 text-xs font-medium text-pink-700">
        <svg
          className="h-1.5 w-1.5 fill-pink-500"
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
