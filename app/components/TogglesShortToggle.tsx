import { useState } from "react";
import { Switch } from "@headlessui/react";
import { classNames } from "./classNames";

/**
 * Tailwind UI – toggles: short toggle.
 *
 * @returns the rendered component.
 */
export function TogglesShortToggle() {
  const [enabled, setEnabled] = useState(false);

  return (
    <Switch
      checked={enabled}
      onChange={setEnabled}
      className="group relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
    >
      <span className="sr-only">Use setting</span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute h-full w-full rounded-md bg-white"
      />
      <span
        aria-hidden="true"
        className={classNames(
          enabled ? "bg-indigo-600" : "bg-gray-200",
          "pointer-events-none absolute mx-auto h-4 w-9 rounded-full transition-colors duration-200 ease-in-out"
        )}
      />
      <span
        aria-hidden="true"
        className={classNames(
          enabled ? "translate-x-5" : "translate-x-0",
          "pointer-events-none absolute left-0 inline-block h-5 w-5 transform rounded-full border border-gray-200 bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out"
        )}
      />
    </Switch>
  );
}
