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
 * Tailwind UI – input groups: input with disabled state.
 *
 * @returns the rendered component.
 */
export function InputGroupsInputWithDisabledState() {
  return (
    <div>
      <label
        htmlFor="email"
        className="block text-sm font-medium leading-6 text-gray-900"
      >
        Email
      </label>
      <div className="mt-2">
        <input
          type="email"
          name="email"
          id="email"
          defaultValue="you@example.com"
          disabled
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 sm:text-sm sm:leading-6"
          placeholder="you@example.com"
        />
      </div>
    </div>
  );
}
