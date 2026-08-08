import { classNames } from "./classNames";
const tabs = [
  { name: "Open", href: "#", current: true },
  { name: "Closed", href: "#", current: false },
];

/**
 * Tailwind UI – section headings: with inline tabs.
 *
 * @returns the rendered component.
 */
export function SectionHeadingsWithInlineTabs() {
  return (
    <div className="border-b border-gray-200">
      <div className="sm:flex sm:items-baseline">
        <h3 className="text-base font-semibold leading-6 text-gray-900">
          Issues
        </h3>
        <div className="mt-4 sm:ml-10 sm:mt-0">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <a
                key={tab.name}
                href={tab.href}
                className={classNames(
                  tab.current
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
                  "whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-medium"
                )}
                aria-current={tab.current ? "page" : undefined}
              >
                {tab.name}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
