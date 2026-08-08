import { Fragment } from "react";
import { Popover, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import {
  BookmarkSquareIcon,
  CalendarDaysIcon,
  LifebuoyIcon,
} from "@heroicons/react/24/outline";

const resources = [
  {
    name: "Help center",
    description: "Get all of your questions answered",
    href: "#",
    icon: LifebuoyIcon,
  },
  {
    name: "Guides",
    description: "Learn how to maximize our platform",
    href: "#",
    icon: BookmarkSquareIcon,
  },
  {
    name: "Events",
    description: "See meet-ups and other events near you",
    href: "#",
    icon: CalendarDaysIcon,
  },
];
const recentPosts = [
  {
    id: 1,
    title: "Boost your conversion rate",
    href: "#",
    date: "Mar 5, 2023",
    datetime: "2023-03-05",
  },
  {
    id: 2,
    title:
      "How to use search engine optimization to drive traffic to your site",
    href: "#",
    date: "Feb 25, 2023",
    datetime: "2023-02-25",
  },
  {
    id: 3,
    title: "Improve your customer experience",
    href: "#",
    date: "Feb 21, 2023",
    datetime: "2023-02-21",
  },
];

/**
 * Tailwind UI – flyout menus: stacked with footer list.
 *
 * @returns the rendered component.
 */
export function FlyoutMenusStackedWithFooterList() {
  return (
    <Popover className="relative">
      <Popover.Button className="inline-flex items-center gap-x-1 text-sm font-semibold leading-6 text-gray-900">
        <span>Resources</span>
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
          <div className="w-screen max-w-md flex-auto overflow-hidden rounded-3xl bg-white text-sm leading-6 shadow-lg ring-1 ring-gray-900/5">
            <div className="p-4">
              {resources.map((item) => (
                <div
                  key={item.name}
                  className="group relative flex gap-x-6 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="mt-1 flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                    <item.icon
                      className="h-6 w-6 text-gray-600 group-hover:text-indigo-600"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <a href={item.href} className="font-semibold text-gray-900">
                      {item.name}
                      <span className="absolute inset-0" />
                    </a>
                    <p className="mt-1 text-gray-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 p-8">
              <div className="flex justify-between">
                <h3 className="text-sm font-semibold leading-6 text-gray-500">
                  Recent posts
                </h3>
                <a
                  href="#"
                  className="text-sm font-semibold leading-6 text-indigo-600"
                >
                  See all <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
              <ul role="list" className="mt-6 space-y-6">
                {recentPosts.map((post) => (
                  <li key={post.id} className="relative">
                    <time
                      dateTime={post.datetime}
                      className="block text-xs leading-6 text-gray-600"
                    >
                      {post.date}
                    </time>
                    <a
                      href={post.href}
                      className="block truncate text-sm font-semibold leading-6 text-gray-900"
                    >
                      {post.title}
                      <span className="absolute inset-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}
