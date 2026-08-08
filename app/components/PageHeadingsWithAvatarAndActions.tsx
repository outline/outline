/**
 * Tailwind UI – page headings: with avatar and actions.
 *
 * @returns the rendered component.
 */
export function PageHeadingsWithAvatarAndActions() {
  return (
    <div className="md:flex md:items-center md:justify-between md:space-x-5">
      <div className="flex items-start space-x-5">
        <div className="shrink-0">
          <div className="relative">
            <img
              className="h-16 w-16 rounded-full"
              src="https://images.unsplash.com/photo-1463453091185-61582044d556?ixlib=rb-=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=8&w=1024&h=1024&q=80"
              alt=""
            />
            <span
              className="absolute inset-0 rounded-full shadow-inner"
              aria-hidden="true"
            />
          </div>
        </div>
        {/*
          Use vertical padding to simulate center alignment when both lines of text are one line,
          but preserve the same layout if the text wraps without making the image jump around.
        */}
        <div className="pt-1.5">
          <h1 className="text-2xl font-bold text-gray-900">Ricardo Cooper</h1>
          <p className="text-sm font-medium text-gray-500">
            Applied for{" "}
            <a href="#" className="text-gray-900">
              Front End Developer
            </a>{" "}
            on <time dateTime="2020-08-25">August 25, 2020</time>
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-col-reverse justify-stretch space-y-4 space-y-reverse sm:flex-row-reverse sm:justify-end sm:space-x-3 sm:space-y-0 sm:space-x-reverse md:mt-0 md:flex-row md:space-x-3">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Disqualify
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Advance to offer
        </button>
      </div>
    </div>
  );
}
