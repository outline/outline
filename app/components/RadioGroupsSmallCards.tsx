import { useState } from "react";
import { RadioGroup } from "@headlessui/react";
import { classNames } from "./classNames";
const memoryOptions = [
  { name: "4 GB", inStock: true },
  { name: "8 GB", inStock: true },
  { name: "16 GB", inStock: true },
  { name: "32 GB", inStock: true },
  { name: "64 GB", inStock: true },
  { name: "128 GB", inStock: false },
];
/**
 * Tailwind UI – radio groups: small cards.
 *
 * @returns the rendered component.
 */
export function RadioGroupsSmallCards() {
  const [mem, setMem] = useState(memoryOptions[2]);
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium leading-6 text-gray-900">RAM</h2>
        <a
          href="#"
          className="text-sm font-medium leading-6 text-indigo-600 hover:text-indigo-500"
        >
          See performance specs
        </a>
      </div>

      <RadioGroup value={mem} onChange={setMem} className="mt-2">
        <RadioGroup.Label className="sr-only">
          Choose a memory option
        </RadioGroup.Label>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {memoryOptions.map((option) => (
            <RadioGroup.Option
              key={option.name}
              value={option}
              className={({ active, checked }) =>
                classNames(
                  option.inStock
                    ? "cursor-pointer focus:outline-hidden"
                    : "cursor-not-allowed opacity-25",
                  active ? "ring-2 ring-indigo-600 ring-offset-2" : "",
                  checked
                    ? "bg-indigo-600 text-white hover:bg-indigo-500"
                    : "ring-1 ring-inset ring-gray-300 bg-white text-gray-900 hover:bg-gray-50",
                  "flex items-center justify-center rounded-md py-3 px-3 text-sm font-semibold uppercase sm:flex-1"
                )
              }
              disabled={!option.inStock}
            >
              <RadioGroup.Label as="span">{option.name}</RadioGroup.Label>
            </RadioGroup.Option>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}
