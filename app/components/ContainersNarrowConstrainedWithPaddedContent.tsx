/**
 * Tailwind UI – containers: narrow constrained with padded content.
 *
 * @returns the rendered component.
 */
export function ContainersNarrowConstrainedWithPaddedContent() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* We've used 3xl here, but feel free to try other max-widths based on your needs */}
      <div className="mx-auto max-w-3xl">{/* Content goes here */}</div>
    </div>
  );
}
