/**
 * Tailwind UI – panels: card with header.
 *
 * @returns the rendered component.
 */
export function PanelsCardWithHeader() {
  return (
    <div className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm">
      <div className="px-4 py-5 sm:px-6">
        {/* Content goes here */}
        {/* We use less vertical padding on card headers on desktop than on body sections */}
      </div>
      <div className="px-4 py-5 sm:p-6">{/* Content goes here */}</div>
    </div>
  );
}
