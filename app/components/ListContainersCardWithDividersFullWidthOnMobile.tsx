const items = [
  { id: 1 },
  // More items...
];
/**
 * Tailwind UI – list containers: card with dividers  full width on mobile.
 *
 * @returns the rendered component.
 */
export function ListContainersCardWithDividersFullWidthOnMobile() {
  return (
    <div className="overflow-hidden bg-white shadow-sm sm:rounded-md">
      <ul role="list" className="divide-y divide-gray-200">
        {items.map((item) => (
          <li key={item.id} className="px-4 py-4 sm:px-6">
            {/* Your content */}
          </li>
        ))}
      </ul>
    </div>
  );
}
