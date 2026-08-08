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
import { QuestionMarkCircleIcon } from "@heroicons/react/20/solid";

/**
 * Tailwind UI – input groups: input with trailing icon.
 *
 * @returns the rendered component.
 */
export function InputGroupsInputWithTrailingIcon() {
  return (
    <div>
      <label
        htmlFor="account-number"
        className="block text-sm font-medium leading-6 text-gray-900"
      >
        Account number
      </label>
      <div className="relative mt-2 rounded-md shadow-xs">
        <input
          type="text"
          name="account-number"
          id="account-number"
          className="block w-full rounded-md border-0 py-1.5 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          placeholder="000-00-0000"
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <QuestionMarkCircleIcon
            className="h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
