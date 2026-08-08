import { CheckCircleIcon } from "@heroicons/react/20/solid";

const steps = [
  { name: "Create account", href: "#", status: "complete" },
  { name: "Profile information", href: "#", status: "current" },
  { name: "Theme", href: "#", status: "upcoming" },
  { name: "Preview", href: "#", status: "upcoming" },
];

/**
 * Tailwind UI – steps: bullets and text.
 *
 * @returns the rendered component.
 */
export function StepsBulletsAndText() {
  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <nav className="flex justify-center" aria-label="Progress">
        <ol role="list" className="space-y-6">
          {steps.map((step) => (
            <li key={step.name}>
              {step.status === "complete" ? (
                <a href={step.href} className="group">
                  <span className="flex items-start">
                    <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                      <CheckCircleIcon
                        className="h-full w-full text-indigo-600 group-hover:text-indigo-800"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="ml-3 text-sm font-medium text-gray-500 group-hover:text-gray-900">
                      {step.name}
                    </span>
                  </span>
                </a>
              ) : step.status === "current" ? (
                <a
                  href={step.href}
                  className="flex items-start"
                  aria-current="step"
                >
                  <span
                    className="relative flex h-5 w-5 shrink-0 items-center justify-center"
                    aria-hidden="true"
                  >
                    <span className="absolute h-4 w-4 rounded-full bg-indigo-200" />
                    <span className="relative block h-2 w-2 rounded-full bg-indigo-600" />
                  </span>
                  <span className="ml-3 text-sm font-medium text-indigo-600">
                    {step.name}
                  </span>
                </a>
              ) : (
                <a href={step.href} className="group">
                  <div className="flex items-start">
                    <div
                      className="relative flex h-5 w-5 shrink-0 items-center justify-center"
                      aria-hidden="true"
                    >
                      <div className="h-2 w-2 rounded-full bg-gray-300 group-hover:bg-gray-400" />
                    </div>
                    <p className="ml-3 text-sm font-medium text-gray-500 group-hover:text-gray-900">
                      {step.name}
                    </p>
                  </div>
                </a>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
