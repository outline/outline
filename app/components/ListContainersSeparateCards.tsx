const items = [
  { id: 1 },
  // More items...
];

/**
 * Tailwind UI – list containers: separate cards.
 *
 * @returns the rendered component.
 */
export function ListContainersSeparateCards() {
  return (
    <ul role="list" className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="overflow-hidden rounded-md bg-white px-6 py-4 shadow-sm"
        >
          {/* Your content */}
        </li>
      ))}
    </ul>
  );
}
