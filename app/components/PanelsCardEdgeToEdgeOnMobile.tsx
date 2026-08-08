/**
 * Tailwind UI – panels: card  edge to edge on mobile.
 *
 * @returns the rendered component.
 */
export function PanelsCardEdgeToEdgeOnMobile() {
  return (
    <>
      {/* Be sure to use this with a layout container that is full-width on mobile */}
      <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">{/* Content goes here */}</div>
      </div>
    </>
  );
}
