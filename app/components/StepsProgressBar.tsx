/**
 * Tailwind UI – steps: progress bar.
 *
 * @returns the rendered component.
 */
export function StepsProgressBar() {
  return (
    <div>
      <h4 className="sr-only">Status</h4>
      <p className="text-sm font-medium text-gray-900">
        Migrating MySQL database...
      </p>
      <div className="mt-6" aria-hidden="true">
        <div className="overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-indigo-600"
            style={{ width: "37.5%" }}
          />
        </div>
        <div className="mt-6 hidden grid-cols-4 text-sm font-medium text-gray-600 sm:grid">
          <div className="text-indigo-600">Copying files</div>
          <div className="text-center text-indigo-600">Migrating database</div>
          <div className="text-center">Compiling assets</div>
          <div className="text-right">Deployed</div>
        </div>
      </div>
    </div>
  );
}
