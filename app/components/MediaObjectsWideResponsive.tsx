/**
 * Tailwind UI – media objects: wide responsive.
 *
 * @returns the rendered component.
 */
export function MediaObjectsWideResponsive() {
  return (
    <div className="sm:flex">
      <div className="mb-4 shrink-0 sm:mb-0 sm:mr-4">
        <svg
          className="h-32 w-full border border-gray-300 bg-white text-gray-300 sm:w-32"
          preserveAspectRatio="none"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 200 200"
          aria-hidden="true"
        >
          <path
            vectorEffect="non-scaling-stroke"
            strokeWidth={1}
            d="M0 0l200 200M0 200L200 0"
          />
        </svg>
      </div>
      <div>
        <h4 className="text-lg font-bold">Lorem ipsum</h4>
        <p className="mt-1">
          Repudiandae sint consequuntur vel. Amet ut nobis explicabo numquam
          expedita quia omnis voluptatem. Minus quidem ipsam quia iusto.
        </p>
      </div>
    </div>
  );
}
