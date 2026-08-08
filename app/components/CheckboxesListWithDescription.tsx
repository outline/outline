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
 * Tailwind UI – checkboxes: list with description.
 *
 * @returns the rendered component.
 */
export function CheckboxesListWithDescription() {
  return (
    <fieldset>
      <legend className="sr-only">Notifications</legend>
      <div className="space-y-5">
        <div className="relative flex items-start">
          <div className="flex h-6 items-center">
            <input
              id="comments"
              aria-describedby="comments-description"
              name="comments"
              type="checkbox"
              className="h-4 w-4 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-600"
            />
          </div>
          <div className="ml-3 text-sm leading-6">
            <label htmlFor="comments" className="font-medium text-gray-900">
              Comments
            </label>
            <p id="comments-description" className="text-gray-500">
              Get notified when someones posts a comment on a posting.
            </p>
          </div>
        </div>
        <div className="relative flex items-start">
          <div className="flex h-6 items-center">
            <input
              id="candidates"
              aria-describedby="candidates-description"
              name="candidates"
              type="checkbox"
              className="h-4 w-4 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-600"
            />
          </div>
          <div className="ml-3 text-sm leading-6">
            <label htmlFor="candidates" className="font-medium text-gray-900">
              Candidates
            </label>
            <p id="candidates-description" className="text-gray-500">
              Get notified when a candidate applies for a job.
            </p>
          </div>
        </div>
        <div className="relative flex items-start">
          <div className="flex h-6 items-center">
            <input
              id="offers"
              aria-describedby="offers-description"
              name="offers"
              type="checkbox"
              className="h-4 w-4 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-600"
            />
          </div>
          <div className="ml-3 text-sm leading-6">
            <label htmlFor="offers" className="font-medium text-gray-900">
              Offers
            </label>
            <p id="offers-description" className="text-gray-500">
              Get notified when a candidate accepts or rejects an offer.
            </p>
          </div>
        </div>
      </div>
    </fieldset>
  );
}
