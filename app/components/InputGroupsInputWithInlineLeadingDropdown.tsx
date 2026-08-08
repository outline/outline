/*
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/forms'),
    ],
  }
  ```
*/
/**
 * Tailwind UI – input groups: input with inline leading dropdown.
 *
 * @returns the rendered component.
 */
export function InputGroupsInputWithInlineLeadingDropdown() {
  return (
    <div>
      <label
        htmlFor="phone-number"
        className="block text-sm font-medium leading-6 text-gray-900"
      >
        Phone Number
      </label>
      <div className="relative mt-2 rounded-md shadow-xs">
        <div className="absolute inset-y-0 left-0 flex items-center">
          <label htmlFor="country" className="sr-only">
            Country
          </label>
          <select
            id="country"
            name="country"
            autoComplete="country"
            className="h-full rounded-md border-0 bg-transparent py-0 pl-3 pr-7 text-gray-500 focus:outline-hidden focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
          >
            <option>US</option>
            <option>CA</option>
            <option>EU</option>
          </select>
        </div>
        <input
          type="text"
          name="phone-number"
          id="phone-number"
          className="block w-full rounded-md border-0 py-1.5 pl-16 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          placeholder="+1 (555) 987-6543"
        />
      </div>
    </div>
  );
}
