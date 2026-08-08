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
 * Tailwind UI – input groups: input with inline add on.
 *
 * @returns the rendered component.
 */
export function InputGroupsInputWithInlineAddOn() {
  return (
    <div>
      <label
        htmlFor="company-website"
        className="block text-sm font-medium leading-6 text-gray-900"
      >
        Company Website
      </label>
      <div className="mt-2">
        <div className="flex rounded-md shadow-xs ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
          <span className="flex select-none items-center pl-3 text-gray-500 sm:text-sm">
            http://
          </span>
          <input
            type="text"
            name="company-website"
            id="company-website"
            className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
            placeholder="www.example.com"
          />
        </div>
      </div>
    </div>
  );
}
