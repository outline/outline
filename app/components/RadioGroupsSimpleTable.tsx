/*
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/forms'),
    ],
  }
  ```
*/
import { useState } from "react";
import { RadioGroup } from "@headlessui/react";
import { classNames } from "./classNames";

const plans = [
  {
    name: "Startup",
    priceMonthly: 29,
    priceYearly: 290,
    limit: "Up to 5 active job postings",
  },
  {
    name: "Business",
    priceMonthly: 99,
    priceYearly: 990,
    limit: "Up to 25 active job postings",
  },
  {
    name: "Enterprise",
    priceMonthly: 249,
    priceYearly: 2490,
    limit: "Unlimited active job postings",
  },
];

/**
 * Tailwind UI – radio groups: simple table.
 *
 * @returns the rendered component.
 */
export function RadioGroupsSimpleTable() {
  const [selected, setSelected] = useState(plans[0]);

  return (
    <RadioGroup value={selected} onChange={setSelected}>
      <RadioGroup.Label className="sr-only">Pricing plans</RadioGroup.Label>
      <div className="relative -space-y-px rounded-md bg-white">
        {plans.map((plan, planIdx) => (
          <RadioGroup.Option
            key={plan.name}
            value={plan}
            className={({ checked }) =>
              classNames(
                planIdx === 0 ? "rounded-tl-md rounded-tr-md" : "",
                planIdx === plans.length - 1
                  ? "rounded-bl-md rounded-br-md"
                  : "",
                checked
                  ? "z-10 border-indigo-200 bg-indigo-50"
                  : "border-gray-200",
                "relative flex cursor-pointer flex-col border p-4 focus:outline-hidden md:grid md:grid-cols-3 md:pl-4 md:pr-6"
              )
            }
          >
            {({ active, checked }) => (
              <>
                <span className="flex items-center text-sm">
                  <span
                    className={classNames(
                      checked
                        ? "bg-indigo-600 border-transparent"
                        : "bg-white border-gray-300",
                      active ? "ring-2 ring-offset-2 ring-indigo-600" : "",
                      "h-4 w-4 rounded-full border flex items-center justify-center"
                    )}
                    aria-hidden="true"
                  >
                    <span className="rounded-full bg-white w-1.5 h-1.5" />
                  </span>
                  <RadioGroup.Label
                    as="span"
                    className={classNames(
                      checked ? "text-indigo-900" : "text-gray-900",
                      "ml-3 font-medium"
                    )}
                  >
                    {plan.name}
                  </RadioGroup.Label>
                </span>
                <RadioGroup.Description
                  as="span"
                  className="ml-6 pl-1 text-sm md:ml-0 md:pl-0 md:text-center"
                >
                  <span
                    className={classNames(
                      checked ? "text-indigo-900" : "text-gray-900",
                      "font-medium"
                    )}
                  >
                    ${plan.priceMonthly} / mo
                  </span>{" "}
                  <span
                    className={checked ? "text-indigo-700" : "text-gray-500"}
                  >
                    (${plan.priceYearly} / yr)
                  </span>
                </RadioGroup.Description>
                <RadioGroup.Description
                  as="span"
                  className={classNames(
                    checked ? "text-indigo-700" : "text-gray-500",
                    "ml-6 pl-1 text-sm md:ml-0 md:pl-0 md:text-right"
                  )}
                >
                  {plan.limit}
                </RadioGroup.Description>
              </>
            )}
          </RadioGroup.Option>
        ))}
      </div>
    </RadioGroup>
  );
}
