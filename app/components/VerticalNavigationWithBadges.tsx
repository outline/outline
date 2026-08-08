import { classNames } from "./classNames";
const navigation = [
  { name: "Dashboard", href: "#", count: "5", current: true },
  { name: "Team", href: "#", current: false },
  { name: "Projects", href: "#", count: "12", current: false },
  { name: "Calendar", href: "#", count: "20+", current: false },
  { name: "Documents", href: "#", current: false },
  { name: "Reports", href: "#", current: false },
];

/**
 * Tailwind UI – vertical navigation: with badges.
 *
 * @returns the rendered component.
 */
export function VerticalNavigationWithBadges() {
  return (
    <nav className="flex flex-1 flex-col" aria-label="Sidebar">
      <ul role="list" className="-mx-2 space-y-1">
        {navigation.map((item) => (
          <li key={item.name}>
            <a
              href={item.href}
              className={classNames(
                item.current
                  ? "bg-gray-50 text-indigo-600"
                  : "text-gray-700 hover:text-indigo-600 hover:bg-gray-50",
                "group flex gap-x-3 rounded-md p-2 pl-3 text-sm leading-6 font-semibold"
              )}
            >
              {item.name}
              {item.count ? (
                <span
                  className="ml-auto w-9 min-w-max whitespace-nowrap rounded-full bg-white px-2.5 py-0.5 text-center text-xs font-medium leading-5 text-gray-600 ring-1 ring-inset ring-gray-200"
                  aria-hidden="true"
                >
                  {item.count}
                </span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
