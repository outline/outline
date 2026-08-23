import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
/**
 * Tailwind UI – alerts: with accent border.
 *
 * @returns the rendered component.
 */
export function AlertsWithAccentBorder() {
  return (
    <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
      <div className="flex">
        <div className="shrink-0">
          <ExclamationTriangleIcon
            className="h-5 w-5 text-yellow-400"
            aria-hidden="true"
          />
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            You have no credits left.{" "}
            <a
              href="#"
              className="font-medium text-yellow-700 underline hover:text-yellow-600"
            >
              Upgrade your account to add more credits.
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
