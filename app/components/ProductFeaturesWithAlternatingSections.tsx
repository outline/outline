import { classNames } from "./classNames";
/*
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/aspect-ratio'),
    ],
  }
  ```
*/
const features = [
  {
    name: "Minimal and thoughtful",
    description:
      'Our laptop sleeve is compact and precisely fits 13" devices. The zipper allows you to access the interior with ease, and the front pouch provides a convenient place for your charger cable.',
    imageSrc:
      "https://tailwindui.com/img/ecommerce-images/product-feature-07-detail-01.jpg",
    imageAlt:
      "White canvas laptop sleeve with gray felt interior, silver zipper, and tan leather zipper pull.",
  },
  {
    name: "Refined details",
    description:
      "We design every detail with the best materials and finishes. This laptop sleeve features durable canvas with double-stitched construction, a felt interior, and a high quality zipper that hold up to daily use.",
    imageSrc:
      "https://tailwindui.com/img/ecommerce-images/product-feature-07-detail-02.jpg",
    imageAlt: "Detail of zipper pull with tan leather and silver rivet.",
  },
];

/**
 * Tailwind UI – product features: with alternating sections.
 *
 * @returns the rendered component.
 */
export function ProductFeaturesWithAlternatingSections() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6 sm:py-32 lg:max-w-7xl lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Protect your device
          </h2>
          <p className="mt-4 text-gray-500">
            As a digital creative, your laptop or tablet is at the center of
            your work. Keep your device safe with a fabric sleeve that matches
            in quality and looks.
          </p>
        </div>

        <div className="mt-16 space-y-16">
          {features.map((feature, featureIdx) => (
            <div
              key={feature.name}
              className="flex flex-col-reverse lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-8"
            >
              <div
                className={classNames(
                  featureIdx % 2 === 0
                    ? "lg:col-start-1"
                    : "lg:col-start-8 xl:col-start-9",
                  "mt-6 lg:col-span-5 lg:row-start-1 lg:mt-0 xl:col-span-4"
                )}
              >
                <h3 className="text-lg font-medium text-gray-900">
                  {feature.name}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {feature.description}
                </p>
              </div>
              <div
                className={classNames(
                  featureIdx % 2 === 0
                    ? "lg:col-start-6 xl:col-start-5"
                    : "lg:col-start-1",
                  "flex-auto lg:col-span-7 lg:row-start-1 xl:col-span-8"
                )}
              >
                <div className="aspect-[5/2] overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={feature.imageSrc}
                    alt={feature.imageAlt}
                    className="object-cover object-center"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
