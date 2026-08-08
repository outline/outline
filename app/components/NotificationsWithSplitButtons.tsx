import { Fragment, useState } from "react";
import { Transition } from "@headlessui/react";

/**
 * Tailwind UI – notifications: with split buttons.
 *
 * @returns the rendered component.
 */
export function NotificationsWithSplitButtons() {
  const [show, setShow] = useState(true);

  return (
    <>
      {/* Global notification live region, render this permanently at the end of the document */}
      <div
        aria-live="assertive"
        className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6"
      >
        <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
          {/* Notification panel, dynamically insert this into the live region when it needs to be displayed */}
          <Transition
            show={show}
            as={Fragment}
            enter="transform ease-out duration-300 transition"
            enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
            enterTo="translate-y-0 opacity-100 sm:translate-x-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="pointer-events-auto flex w-full max-w-md divide-x divide-gray-200 rounded-lg bg-white shadow-lg ring-1 ring-black/5">
              <div className="flex w-0 flex-1 items-center p-4">
                <div className="w-full">
                  <p className="text-sm font-medium text-gray-900">
                    Receive notifications
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Notifications may include alerts, sounds, and badges.
                  </p>
                </div>
              </div>
              <div className="flex">
                <div className="flex flex-col divide-y divide-gray-200">
                  <div className="flex h-0 flex-1">
                    <button
                      type="button"
                      className="flex w-full items-center justify-center rounded-none rounded-tr-lg border border-transparent px-4 py-3 text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:z-10 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      onClick={() => {
                        setShow(false);
                      }}
                    >
                      Reply
                    </button>
                  </div>
                  <div className="flex h-0 flex-1">
                    <button
                      type="button"
                      className="flex w-full items-center justify-center rounded-none rounded-br-lg border border-transparent px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      onClick={() => {
                        setShow(false);
                      }}
                    >
                      Don't allow
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </>
  );
}
