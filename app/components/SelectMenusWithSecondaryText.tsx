import { Fragment, useState } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { classNames } from "./classNames";
const people = [
  { name: "Wade Cooper", username: "@wadecooper" },
  { name: "Arlene Mccoy", username: "@arlenemccoy" },
  { name: "Devon Webb", username: "@devonwebb" },
  { name: "Tom Cook", username: "@tomcook" },
  { name: "Tanya Fox", username: "@tanyafox" },
  { name: "Hellen Schmidt", username: "@hellenschmidt" },
  { name: "Caroline Schultz", username: "@carolineschultz" },
  { name: "Mason Heaney", username: "@masonheaney" },
  { name: "Claudie Smitham", username: "@claudiesmitham" },
  { name: "Emil Schaefer", username: "@emilschaefer" },
];
/**
 * Tailwind UI – select menus: with secondary text.
 *
 * @returns the rendered component.
 */
export function SelectMenusWithSecondaryText() {
  const [selected, setSelected] = useState(people[3]);
  return (
    <Listbox value={selected} onChange={setSelected}>
      {({ open }) => (
        <>
          <Listbox.Label className="block text-sm font-medium leading-6 text-gray-900">
            Assigned to
          </Listbox.Label>
          <div className="relative mt-2">
            <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 sm:text-sm sm:leading-6">
              <span className="inline-flex w-full truncate">
                <span className="truncate">{selected.name}</span>
                <span className="ml-2 truncate text-gray-500">
                  {selected.username}
                </span>
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </span>
            </Listbox.Button>

            <Transition
              show={open}
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-hidden sm:text-sm">
                {people.map((person) => (
                  <Listbox.Option
                    key={person.username}
                    className={({ active }) =>
                      classNames(
                        active ? "bg-indigo-600 text-white" : "text-gray-900",
                        "relative cursor-default select-none py-2 pl-3 pr-9"
                      )
                    }
                    value={person}
                  >
                    {({ selected, active }) => (
                      <>
                        <div className="flex">
                          <span
                            className={classNames(
                              selected ? "font-semibold" : "font-normal",
                              "truncate"
                            )}
                          >
                            {person.name}
                          </span>
                          <span
                            className={classNames(
                              active ? "text-indigo-200" : "text-gray-500",
                              "ml-2 truncate"
                            )}
                          >
                            {person.username}
                          </span>
                        </div>

                        {selected ? (
                          <span
                            className={classNames(
                              active ? "text-white" : "text-indigo-600",
                              "absolute inset-y-0 right-0 flex items-center pr-4"
                            )}
                          >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </>
      )}
    </Listbox>
  );
}
