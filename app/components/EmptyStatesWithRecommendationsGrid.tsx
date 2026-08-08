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
import { PlusIcon } from "@heroicons/react/20/solid";

const people = [
  {
    name: "Lindsay Walton",
    role: "Front-end Developer",
    imageUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    name: "Courtney Henry",
    role: "Designer",
    imageUrl:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    name: "Tom Cook",
    role: "Director of Product",
    imageUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    name: "Whitney Francis",
    role: "Copywriter",
    imageUrl:
      "https://images.unsplash.com/photo-1517365830460-955ce3ccd263?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    name: "Leonard Krasner",
    role: "Senior Designer",
    imageUrl:
      "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    name: "Floyd Miles",
    role: "Principal Designer",
    imageUrl:
      "https://images.unsplash.com/photo-1463453091185-61582044d556?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
];

/**
 * Tailwind UI – empty states: with recommendations grid.
 *
 * @returns the rendered component.
 */
export function EmptyStatesWithRecommendationsGrid() {
  return (
    <div className="mx-auto max-w-md sm:max-w-3xl">
      <div>
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A10.003 10.003 0 0124 26c4.21 0 7.813 2.602 9.288 6.286M30 14a6 6 0 11-12 0 6 6 0 0112 0zm12 6a4 4 0 11-8 0 4 4 0 018 0zm-28 0a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <h2 className="mt-2 text-base font-semibold leading-6 text-gray-900">
            Add team members
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            You haven’t added any team members to your project yet.
          </p>
        </div>
        <form className="mt-6 sm:flex sm:items-center" action="#">
          <label htmlFor="emails" className="sr-only">
            Email addresses
          </label>
          <div className="grid grid-cols-1 sm:flex-auto">
            <input
              type="text"
              name="emails"
              id="emails"
              className="peer relative col-start-1 row-start-1 border-0 bg-transparent py-1.5 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
              placeholder="Enter an email"
            />
            <div
              className="col-start-1 col-end-3 row-start-1 rounded-md shadow-xs ring-1 ring-inset ring-gray-300 peer-focus:ring-2 peer-focus:ring-indigo-600"
              aria-hidden="true"
            />
            <div className="col-start-2 row-start-1 flex items-center">
              <span
                className="h-4 w-px flex-none bg-gray-200"
                aria-hidden="true"
              />
              <label htmlFor="role" className="sr-only">
                Role
              </label>
              <select
                id="role"
                name="role"
                className="rounded-md border-0 bg-transparent py-1.5 pl-4 pr-7 text-gray-900 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              >
                <option>Can edit</option>
                <option>Can view</option>
              </select>
            </div>
          </div>
          <div className="mt-3 sm:ml-4 sm:mt-0 sm:shrink-0">
            <button
              type="submit"
              className="block w-full rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Send invite
            </button>
          </div>
        </form>
      </div>
      <div className="mt-10">
        <h3 className="text-sm font-medium text-gray-500">
          Recommended team members
        </h3>
        <ul role="list" className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {people.map((person, personIdx) => (
            <li key={personIdx}>
              <button
                type="button"
                className="group flex w-full items-center justify-between space-x-3 rounded-full border border-gray-300 p-2 text-left shadow-xs hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <span className="flex min-w-0 flex-1 items-center space-x-3">
                  <span className="block shrink-0">
                    <img
                      className="h-10 w-10 rounded-full"
                      src={person.imageUrl}
                      alt=""
                    />
                  </span>
                  <span className="block min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900">
                      {person.name}
                    </span>
                    <span className="block truncate text-sm font-medium text-gray-500">
                      {person.role}
                    </span>
                  </span>
                </span>
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
                  <PlusIcon
                    className="h-5 w-5 text-gray-400 group-hover:text-gray-500"
                    aria-hidden="true"
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
