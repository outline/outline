const items = [
  { id: 1 },
  // More items...
];

/**
 * Tailwind UI – list containers: simple with dividers  full width on mobile.
 *
 * @returns the rendered component.
 */
export function ListContainersSimpleWithDividersFullWidthOnMobile() {
  return (
    <ul role="list" className="divide-y divide-gray-200">
      {items.map((item) => (
        <li key={item.id} className="px-4 py-4 sm:px-0">
          {/* Your content */}
        </li>
      ))}
    </ul>
  );
}
