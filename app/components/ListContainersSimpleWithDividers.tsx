const items = [
  { id: 1 },
  // More items...
];

/**
 * Tailwind UI – list containers: simple with dividers.
 *
 * @returns the rendered component.
 */
export function ListContainersSimpleWithDividers() {
  return (
    <ul role="list" className="divide-y divide-gray-200">
      {items.map((item) => (
        <li key={item.id} className="py-4">
          {/* Your content */}
        </li>
      ))}
    </ul>
  );
}
