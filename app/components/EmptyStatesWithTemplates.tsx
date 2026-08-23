import { ChevronRightIcon } from "@heroicons/react/20/solid";
import {
  CalendarIcon,
  CommandLineIcon,
  MegaphoneIcon,
} from "@heroicons/react/24/outline";
import { classNames } from "./classNames";
const items = [
  {
    name: "Marketing Campaign",
    description: "I think the kids call these memes these days.",
    href: "#",
    iconColor: "bg-pink-500",
    icon: MegaphoneIcon,
  },
  {
    name: "Engineering Project",
    description:
      "Something really expensive that will ultimately get cancelled.",
    href: "#",
    iconColor: "bg-purple-500",
    icon: CommandLineIcon,
  },
  {
    name: "Event",
    description: "Like a conference all about you that no one will care about.",
    href: "#",
    iconColor: "bg-yellow-500",
    icon: CalendarIcon,
  },
];
/**
 * Tailwind UI – empty states: with templates.
 *
 * @returns the rendered component.
 */
export function EmptyStatesWithTemplates() {
  return (
    <div className="mx-auto max-w-lg">
      <h2 className="text-base font-semibold leading-6 text-gray-900">
        Create your first project
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Get started by selecting a template or start from an empty project.
      </p>
      <ul
        role="list"
        className="mt-6 divide-y divide-gray-200 border-b border-t border-gray-200"
      >
        {items.map((item, itemIdx) => (
          <li key={itemIdx}>
            <div className="group relative flex items-start space-x-3 py-4">
              <div className="shrink-0">
                <span
                  className={classNames(
                    item.iconColor,
                    "inline-flex h-10 w-10 items-center justify-center rounded-lg"
                  )}
                >
                  <item.icon
                    className="h-6 w-6 text-white"
                    aria-hidden="true"
                  />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900">
                  <a href={item.href}>
                    <span className="absolute inset-0" aria-hidden="true" />
                    {item.name}
                  </a>
                </div>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              <div className="shrink-0 self-center">
                <ChevronRightIcon
                  className="h-5 w-5 text-gray-400 group-hover:text-gray-500"
                  aria-hidden="true"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex">
        <a
          href="#"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Or start from an empty project
          <span aria-hidden="true"> &rarr;</span>
        </a>
      </div>
    </div>
  );
}
