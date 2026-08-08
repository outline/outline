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
 * Tailwind UI – input groups: input with gray background and bottom border.
 *
 * @returns the rendered component.
 */
export function InputGroupsInputWithGrayBackgroundAndBottomBorder() {
  return (
    <div>
      <label
        htmlFor="name"
        className="block text-sm font-medium leading-6 text-gray-900"
      >
        Name
      </label>
      <div className="relative mt-2">
        <input
          type="text"
          name="name"
          id="name"
          className="peer block w-full border-0 bg-gray-50 py-1.5 text-gray-900 focus:ring-0 sm:text-sm sm:leading-6"
          placeholder="Jane Smith"
        />
        <div
          className="absolute inset-x-0 bottom-0 border-t border-gray-300 peer-focus:border-t-2 peer-focus:border-indigo-600"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
