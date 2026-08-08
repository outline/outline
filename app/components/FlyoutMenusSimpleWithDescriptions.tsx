import { Fragment } from "react";
import { Popover, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";

const solutions = [
  {
    name: "Blog",
    description: "Learn about tips, product updates and company culture",
    href: "#",
  },
  {
    name: "Help center",
    description:
      "Get all of your questions answered in our forums of contact support",
    href: "#",
  },
  {
    name: "Guides",
    description: "Learn how to maximize our platform to get the most out of it",
    href: "#",
  },
  {
    name: "Events",
    description:
      "Check out webinars with experts and learn about our annual conference",
    href: "#",
  },
  {
    name: "Security",
    description: "Understand how we take your privacy seriously",
    href: "#",
  },
];

/**
 * Tailwind UI – flyout menus: simple with descriptions.
 *
 * @returns the rendered component.
 */
export function FlyoutMenusSimpleWithDescriptions() {
  return (
    <Popover className="relative">
      <Popover.Button className="inline-flex items-center gap-x-1 text-sm font-semibold leading-6 text-gray-900">
        <span>Solutions</span>
        <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
      </Popover.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Popover.Panel className="absolute left-1/2 z-10 mt-5 flex w-screen max-w-max -translate-x-1/2 px-4">
          <div className="w-screen max-w-sm flex-auto rounded-3xl bg-white p-4 text-sm leading-6 shadow-lg ring-1 ring-gray-900/5">
            {solutions.map((item) => (
              <div
                key={item.name}
                className="relative rounded-lg p-4 hover:bg-gray-50"
              >
                <a href={item.href} className="font-semibold text-gray-900">
                  {item.name}
                  <span className="absolute inset-0" />
                </a>
                <p className="mt-1 text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}
