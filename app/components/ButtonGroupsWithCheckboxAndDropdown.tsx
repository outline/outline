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
 * Tailwind UI – button groups: with checkbox and dropdown.
 *
 * @returns the rendered component.
 */
export function ButtonGroupsWithCheckboxAndDropdown() {
  return (
    <span className="inline-flex rounded-md shadow-xs">
      <span className="inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2">
        <label htmlFor="select-all" className="sr-only">
          Select all
        </label>
        <input
          id="select-all"
          type="checkbox"
          name="select-all"
          className="h-4 w-4 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-600"
        />
      </span>
      <label htmlFor="message-type" className="sr-only">
        Select message type
      </label>
      <select
        id="message-type"
        name="message-type"
        className="-ml-px block w-full rounded-l-none rounded-r-md border-0 bg-white py-1.5 pl-3 pr-9 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
      >
        <option>Unread messages</option>
        <option>Sent messages</option>
        <option>All messages</option>
      </select>
    </span>
  );
}
