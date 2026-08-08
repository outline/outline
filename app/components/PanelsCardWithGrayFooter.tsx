/**
 * Tailwind UI – panels: card with gray footer.
 *
 * @returns the rendered component.
 */
export function PanelsCardWithGrayFooter() {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
      <div className="px-4 py-5 sm:p-6">{/* Content goes here */}</div>
      <div className="bg-gray-50 px-4 py-4 sm:px-6">
        {/* Content goes here */}
        {/* We use less vertical padding on card footers at all sizes than on headers or body sections */}
      </div>
    </div>
  );
}
