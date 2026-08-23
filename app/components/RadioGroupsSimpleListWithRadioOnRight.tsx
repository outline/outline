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
const sides = [
  { id: null, name: "None" },
  { id: 1, name: "Baked beans" },
  { id: 2, name: "Coleslaw" },
  { id: 3, name: "French fries" },
  { id: 4, name: "Garden salad" },
  { id: 5, name: "Mashed potatoes" },
];
/**
 * Tailwind UI – radio groups: simple list with radio on right.
 *
 * @returns the rendered component.
 */
export function RadioGroupsSimpleListWithRadioOnRight() {
  return (
    <fieldset>
      <legend className="text-base font-semibold text-gray-900">
        Select a side
      </legend>
      <div className="mt-4 divide-y divide-gray-200 border-b border-t border-gray-200">
        {sides.map((side, sideIdx) => (
          <div key={sideIdx} className="relative flex items-start py-4">
            <div className="min-w-0 flex-1 text-sm leading-6">
              <label
                htmlFor={`side-${side.id}`}
                className="select-none font-medium text-gray-900"
              >
                {side.name}
              </label>
            </div>
            <div className="ml-3 flex h-6 items-center">
              <input
                id={`side-${side.id}`}
                name="plan"
                type="radio"
                defaultChecked={side.id === null}
                className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
              />
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
