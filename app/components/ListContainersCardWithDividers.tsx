const items = [
  { id: 1 },
  // More items...
];

/**
 * Tailwind UI – list containers: card with dividers.
 *
 * @returns the rendered component.
 */
export function ListContainersCardWithDividers() {
  return (
    <div className="overflow-hidden rounded-md bg-white shadow-sm">
      <ul role="list" className="divide-y divide-gray-200">
        {items.map((item) => (
          <li key={item.id} className="px-6 py-4">
            {/* Your content */}
          </li>
        ))}
      </ul>
    </div>
  );
}
