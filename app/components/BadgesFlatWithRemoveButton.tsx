/**
 * Tailwind UI – badges: flat with remove button.
 *
 * @returns the rendered component.
 */
export function BadgesFlatWithRemoveButton() {
  return (
    <>
      <span className="inline-flex items-center gap-x-0.5 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
        Badge
        <button
          type="button"
          className="group relative -mr-1 h-3.5 w-3.5 rounded-xs hover:bg-gray-500/20"
        >
          <span className="sr-only">Remove</span>
          <svg
            viewBox="0 0 14 14"
            className="h-3.5 w-3.5 stroke-gray-700/50 group-hover:stroke-gray-700/75"
          >
            <path d="M4 4l6 6m0-6l-6 6" />
          </svg>
          <span className="absolute -inset-1" />
        </button>
      </span>
      <span className="inline-flex items-center gap-x-0.5 rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
        Badge
        <button
          type="button"
          className="group relative -mr-1 h-3.5 w-3.5 rounded-xs hover:bg-red-600/20"
        >
          <span className="sr-only">Remove</span>
          <svg
            viewBox="0 0 14 14"
            className="h-3.5 w-3.5 stroke-red-700/50 group-hover:stroke-red-700/75"
          >
            <path d="M4 4l6 6m0-6l-6 6" />
          </svg>
          <span className="absolute -inset-1" />
        </button>
      </span>
      <span className="inline-flex items-center gap-x-0.5 rounded-md bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
        Badge
        <button
          type="button"
          className="group relative -mr-1 h-3.5 w-3.5 rounded-xs hover:bg-yellow-600/20"
        >
          <span className="sr-only">Remove</span>
          <svg
            viewBox="0 0 14 14"
            className="h-3.5 w-3.5 stroke-yellow-800/50 group-hover:stroke-yellow-800/75"
          >
            <path d="M4 4l6 6m0-6l-6 6" />
          </svg>
          <span className="absolute -inset-1" />
        </button>
      </span>
      <span className="inline-flex items-center gap-x-0.5 rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
        Badge
        <button
          type="button"
          className="group relative -mr-1 h-3.5 w-3.5 rounded-xs hover:bg-green-600/20"
        >
          <span className="sr-only">Remove</span>
          <svg
            viewBox="0 0 14 14"
            className="h-3.5 w-3.5 stroke-green-800/50 group-hover:stroke-green-800/75"
          >
            <path d="M4 4l6 6m0-6l-6 6" />
          </svg>
          <span className="absolute -inset-1" />
        </button>
      </span>
      <span className="inline-flex items-center gap-x-0.5 rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
        Badge
        <button
          type="button"
          className="group relative -mr-1 h-3.5 w-3.5 rounded-xs hover:bg-blue-600/20"
        >
          <span className="sr-only">Remove</span>
          <svg
            viewBox="0 0 14 14"
            className="h-3.5 w-3.5 stroke-blue-800/50 group-hover:stroke-blue-800/75"
          >
            <path d="M4 4l6 6m0-6l-6 6" />
          </svg>
          <span className="absolute -inset-1" />
        </button>
      </span>
      <span className="inline-flex items-center gap-x-0.5 rounded-md bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
        Badge
        <button
          type="button"
          className="group relative -mr-1 h-3.5 w-3.5 rounded-xs hover:bg-indigo-600/20"
        >
          <span className="sr-only">Remove</span>
          <svg
            viewBox="0 0 14 14"
            className="h-3.5 w-3.5 stroke-indigo-700/50 group-hover:stroke-indigo-700/75"
          >
            <path d="M4 4l6 6m0-6l-6 6" />
          </svg>
          <span className="absolute -inset-1" />
        </button>
      </span>
      <span className="inline-flex items-center gap-x-0.5 rounded-md bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
        Badge
        <button
          type="button"
          className="group relative -mr-1 h-3.5 w-3.5 rounded-xs hover:bg-purple-600/20"
        >
          <span className="sr-only">Remove</span>
          <svg
            viewBox="0 0 14 14"
            className="h-3.5 w-3.5 stroke-violet-700/50 group-hover:stroke-violet-700/75"
          >
            <path d="M4 4l6 6m0-6l-6 6" />
          </svg>
          <span className="absolute -inset-1" />
        </button>
      </span>
      <span className="inline-flex items-center gap-x-0.5 rounded-md bg-pink-100 px-2 py-1 text-xs font-medium text-pink-700">
        Badge
        <button
          type="button"
          className="group relative -mr-1 h-3.5 w-3.5 rounded-xs hover:bg-pink-600/20"
        >
          <span className="sr-only">Remove</span>
          <svg
            viewBox="0 0 14 14"
            className="h-3.5 w-3.5 stroke-pink-800/50 group-hover:stroke-pink-800/75"
          >
            <path d="M4 4l6 6m0-6l-6 6" />
          </svg>
          <span className="absolute -inset-1" />
        </button>
      </span>
    </>
  );
}
