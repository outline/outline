import {
  CalendarIcon,
  CheckBadgeIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";

const incentives = [
  { name: "Free, contactless delivery", icon: TruckIcon },
  { name: "No questions asked returns", icon: CheckBadgeIcon },
  { name: "2-year warranty", icon: CalendarIcon },
];

/**
 * Tailwind UI – incentives: 3 column with icons.
 *
 * @returns the rendered component.
 */
export function Incentives3ColumnWithIcons() {
  return (
    <div className="bg-white">
      <h2 className="sr-only">Why you should buy from us</h2>
      <div className="flex overflow-x-auto">
        <div className="mx-auto flex space-x-12 whitespace-nowrap px-4 py-3 sm:px-6 lg:space-x-24 lg:px-8">
          {incentives.map((incentive) => (
            <div
              key={incentive.name}
              className="flex items-center text-sm font-medium text-indigo-600"
            >
              <incentive.icon
                className="mr-2 h-6 w-6 flex-none"
                aria-hidden="true"
              />
              <p>{incentive.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
