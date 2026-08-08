/**
 * Tailwind UI – media objects: nested.
 *
 * @returns the rendered component.
 */
export function MediaObjectsNested() {
  return (
    <div className="flex">
      <div className="mr-4 shrink-0">
        <svg
          className="h-16 w-16 border border-gray-300 bg-white text-gray-300"
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

        <div className="mt-6 flex">
          <div className="mr-4 shrink-0">
            <svg
              className="h-12 w-12 border border-gray-300 bg-white text-gray-300"
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
        <div className="mt-6 flex">
          <div className="mr-4 shrink-0">
            <svg
              className="h-12 w-12 border border-gray-300 bg-white text-gray-300"
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
      </div>
    </div>
  );
}
