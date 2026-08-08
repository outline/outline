import {
  CalendarIcon,
  ChartPieIcon,
  DocumentDuplicateIcon,
  FolderIcon,
  HomeIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { classNames } from "./classNames";

const navigation = [
  { name: "Dashboard", href: "#", icon: HomeIcon, count: "5", current: true },
  { name: "Team", href: "#", icon: UsersIcon, current: false },
  {
    name: "Projects",
    href: "#",
    icon: FolderIcon,
    count: "12",
    current: false,
  },
  {
    name: "Calendar",
    href: "#",
    icon: CalendarIcon,
    count: "20+",
    current: false,
  },
  { name: "Documents", href: "#", icon: DocumentDuplicateIcon, current: false },
  { name: "Reports", href: "#", icon: ChartPieIcon, current: false },
];
const secondaryNavigation = [
  { name: "Website redesign", href: "#", initial: "W", current: false },
  { name: "GraphQL API", href: "#", initial: "G", current: false },
  {
    name: "Customer migration guides",
    href: "#",
    initial: "C",
    current: false,
  },
  { name: "Profit sharing program", href: "#", initial: "P", current: false },
];

/**
 * Tailwind UI – vertical navigation: on gray.
 *
 * @returns the rendered component.
 */
export function VerticalNavigationOnGray() {
  return (
    <nav className="flex flex-1 flex-col" aria-label="Sidebar">
      <ul role="list" className="flex flex-1 flex-col gap-y-7">
        <li>
          <ul role="list" className="-mx-2 space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <a
                  href={item.href}
                  className={classNames(
                    item.current
                      ? "bg-gray-100 text-indigo-600"
                      : "text-gray-700 hover:text-indigo-600 hover:bg-gray-100",
                    "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                  )}
                >
                  <item.icon
                    className={classNames(
                      item.current
                        ? "text-indigo-600"
                        : "text-gray-400 group-hover:text-indigo-600",
                      "h-6 w-6 shrink-0"
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                  {item.count ? (
                    <span
                      className="ml-auto w-9 min-w-max whitespace-nowrap rounded-full bg-gray-50 px-2.5 py-0.5 text-center text-xs font-medium leading-5 text-gray-600 ring-1 ring-inset ring-gray-200"
                      aria-hidden="true"
                    >
                      {item.count}
                    </span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        </li>
        <li>
          <div className="text-xs font-semibold leading-6 text-gray-400">
            Projects
          </div>
          <ul role="list" className="-mx-2 mt-2 space-y-1">
            {secondaryNavigation.map((item) => (
              <li key={item.name}>
                <a
                  href={item.href}
                  className={classNames(
                    item.current
                      ? "bg-gray-50 text-indigo-600"
                      : "text-gray-700 hover:text-indigo-600 hover:bg-gray-100",
                    "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                  )}
                >
                  <span
                    className={classNames(
                      item.current
                        ? "text-indigo-600 border-indigo-600"
                        : "text-gray-400 border-gray-200 group-hover:border-indigo-600 group-hover:text-indigo-600",
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[0.625rem] font-medium bg-white"
                    )}
                  >
                    {item.initial}
                  </span>
                  <span className="truncate">{item.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </nav>
  );
}
