const items = [
  { id: 1 },
  // More items...
];

/**
 * Tailwind UI – list containers: flat card with dividers.
 *
 * @returns the rendered component.
 */
export function ListContainersFlatCardWithDividers() {
  return (
    <div className="overflow-hidden rounded-md border border-gray-300 bg-white">
      <ul role="list" className="divide-y divide-gray-300">
        {items.map((item) => (
          <li key={item.id} className="px-6 py-4">
            {/* Your content */}
          </li>
        ))}
      </ul>
    </div>
  );
}
