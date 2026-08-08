/**
 * Tailwind UI – panels: well  edge to edge on mobile.
 *
 * @returns the rendered component.
 */
export function PanelsWellEdgeToEdgeOnMobile() {
  return (
    <>
      {/* Be sure to use this with a layout container that is full-width on mobile */}
      <div className="overflow-hidden bg-gray-50 sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">{/* Content goes here */}</div>
      </div>
    </>
  );
}
