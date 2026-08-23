import {
  ArrowPathIcon,
  CalendarIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
const perks = [
  {
    name: "10-year all-inclusive warranty",
    description: "We’ll replace it with a new one",
    icon: CalendarIcon,
  },
  {
    name: "Free shipping on returns",
    description: "Send it back for free",
    icon: ArrowPathIcon,
  },
  {
    name: "Free, contactless delivery",
    description: "The shipping is on us",
    icon: TruckIcon,
  },
];
/**
 * Tailwind UI – incentives: 3 column with icons and supporting text.
 *
 * @returns the rendered component.
 */
export function Incentives3ColumnWithIconsAndSupportingText() {
  return (
    <div className="bg-white">
      <h2 className="sr-only">Our perks</h2>
      <div className="mx-auto max-w-7xl divide-y divide-gray-200 lg:flex lg:justify-center lg:divide-x lg:divide-y-0 lg:py-8">
        {perks.map((perk, perkIdx) => (
          <div key={perkIdx} className="py-8 lg:w-1/3 lg:flex-none lg:py-0">
            <div className="mx-auto flex max-w-xs items-center px-4 lg:max-w-none lg:px-8">
              <perk.icon
                className="h-8 w-8 shrink-0 text-indigo-600"
                aria-hidden="true"
              />
              <div className="ml-4 flex flex-auto flex-col-reverse">
                <h3 className="font-medium text-gray-900">{perk.name}</h3>
                <p className="text-sm text-gray-500">{perk.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
