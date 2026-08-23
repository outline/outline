import { useState } from "react";
import { Switch } from "@headlessui/react";
import { classNames } from "./classNames";
/**
 * Tailwind UI – action panels: with toggle.
 *
 * @returns the rendered component.
 */
export function ActionPanelsWithToggle() {
  const [enabled, setEnabled] = useState(false);
  return (
    <div className="bg-white shadow-sm sm:rounded-lg">
      <Switch.Group as="div" className="px-4 py-5 sm:p-6">
        <Switch.Label
          as="h3"
          className="text-base font-semibold leading-6 text-gray-900"
          passive
        >
          Renew subscription automatically
        </Switch.Label>
        <div className="mt-2 sm:flex sm:items-start sm:justify-between">
          <div className="max-w-xl text-sm text-gray-500">
            <Switch.Description>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Explicabo
              totam non cumque deserunt officiis ex maiores nostrum.
            </Switch.Description>
          </div>
          <div className="mt-5 sm:ml-6 sm:mt-0 sm:flex sm:shrink-0 sm:items-center">
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
                  "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
                )}
              />
            </Switch>
          </div>
        </div>
      </Switch.Group>
    </div>
  );
}
