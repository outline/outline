const items = [
  { id: 1 },
  // More items...
];
/**
 * Tailwind UI – list containers: separate cards  full width on mobile.
 *
 * @returns the rendered component.
 */
export function ListContainersSeparateCardsFullWidthOnMobile() {
  return (
    <ul role="list" className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="overflow-hidden bg-white px-4 py-4 shadow-sm sm:rounded-md sm:px-6"
        >
          {/* Your content */}
        </li>
      ))}
    </ul>
  );
}
