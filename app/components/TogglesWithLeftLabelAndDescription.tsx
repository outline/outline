import { useState } from "react";
import { Switch } from "@headlessui/react";
import { classNames } from "./classNames";

/**
 * Tailwind UI – toggles: with left label and description.
 *
 * @returns the rendered component.
 */
export function TogglesWithLeftLabelAndDescription() {
  const [enabled, setEnabled] = useState(false);

  return (
    <Switch.Group as="div" className="flex items-center justify-between">
      <span className="flex grow flex-col">
        <Switch.Label
          as="span"
          className="text-sm font-medium leading-6 text-gray-900"
          passive
        >
          Available to hire
        </Switch.Label>
        <Switch.Description as="span" className="text-sm text-gray-500">
          Nulla amet tempus sit accumsan. Aliquet turpis sed sit lacinia.
        </Switch.Description>
      </span>
      <Switch
        checked={enabled}
        onChange={setEnabled}
        className={classNames(
          enabled ? "bg-indigo-600" : "bg-gray-200",
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
        )}
      >
        <span
          aria-hidden="true"
          className={classNames(
            enabled ? "translate-x-5" : "translate-x-0",
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
          )}
        />
      </Switch>
    </Switch.Group>
  );
}
