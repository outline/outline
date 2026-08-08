/*
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/forms'),
      require('@tailwindcss/aspect-ratio'),
    ],
  }
  ```
*/
import { Fragment, useState } from "react";
import { Dialog, Popover, Tab, Transition } from "@headlessui/react";
import {
  Bars3Icon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { classNames } from "./classNames";

const currencies = ["CAD", "USD", "AUD", "EUR", "GBP"];
const navigation = {
  categories: [
    {
      name: "Women",
      featured: [
        { name: "Sleep", href: "#" },
        { name: "Swimwear", href: "#" },
        { name: "Underwear", href: "#" },
      ],
      collection: [
        { name: "Everything", href: "#" },
        { name: "Core", href: "#" },
        { name: "New Arrivals", href: "#" },
        { name: "Sale", href: "#" },
      ],
      categories: [
        { name: "Basic Tees", href: "#" },
        { name: "Artwork Tees", href: "#" },
        { name: "Bottoms", href: "#" },
        { name: "Underwear", href: "#" },
        { name: "Accessories", href: "#" },
      ],
      brands: [
        { name: "Full Nelson", href: "#" },
        { name: "My Way", href: "#" },
        { name: "Re-Arranged", href: "#" },
        { name: "Counterfeit", href: "#" },
        { name: "Significant Other", href: "#" },
      ],
    },
    {
      name: "Men",
      featured: [
        { name: "Casual", href: "#" },
        { name: "Boxers", href: "#" },
        { name: "Outdoor", href: "#" },
      ],
      collection: [
        { name: "Everything", href: "#" },
        { name: "Core", href: "#" },
        { name: "New Arrivals", href: "#" },
        { name: "Sale", href: "#" },
      ],
      categories: [
        { name: "Artwork Tees", href: "#" },
        { name: "Pants", href: "#" },
        { name: "Accessories", href: "#" },
        { name: "Boxers", href: "#" },
        { name: "Basic Tees", href: "#" },
      ],
      brands: [
        { name: "Significant Other", href: "#" },
        { name: "My Way", href: "#" },
        { name: "Counterfeit", href: "#" },
        { name: "Re-Arranged", href: "#" },
        { name: "Full Nelson", href: "#" },
      ],
    },
  ],
  pages: [
    { name: "Company", href: "#" },
    { name: "Stores", href: "#" },
  ],
};
const offers = [
  {
    name: "Download the app",
    description: "Get an exclusive $5 off code",
    href: "#",
  },
  {
    name: "Return when you're ready",
    description: "60 days of free returns",
    href: "#",
  },
  {
    name: "Sign up for our newsletter",
    description: "15% off your first order",
    href: "#",
  },
];
const trendingProducts = [
  {
    id: 1,
    name: "Machined Pen",
    color: "Black",
    price: "$35",
    href: "#",
    imageSrc:
      "https://tailwindui.com/img/ecommerce-images/home-page-02-product-01.jpg",
    imageAlt:
      "Black machined steel pen with hexagonal grip and small white logo at top.",
    availableColors: [
      { name: "Black", colorBg: "#111827" },
      { name: "Brass", colorBg: "#FDE68A" },
      { name: "Chrome", colorBg: "#E5E7EB" },
    ],
  },
  // More products...
];
const collections = [
  {
    name: "Desk and Office",
    description: "Work from home accessories",
    imageSrc:
      "https://tailwindui.com/img/ecommerce-images/home-page-02-edition-01.jpg",
    imageAlt:
      "Desk with leather desk pad, walnut desk organizer, wireless keyboard and mouse, and porcelain mug.",
    href: "#",
  },
  {
    name: "Self-Improvement",
    description: "Journals and note-taking",
    imageSrc:
      "https://tailwindui.com/img/ecommerce-images/home-page-02-edition-02.jpg",
    imageAlt:
      "Wood table with porcelain mug, leather journal, brass pen, leather key ring, and a houseplant.",
    href: "#",
  },
  {
    name: "Travel",
    description: "Daily commute essentials",
    imageSrc:
      "https://tailwindui.com/img/ecommerce-images/home-page-02-edition-03.jpg",
    imageAlt: "Collection of four insulated travel bottles on wooden shelf.",
    href: "#",
  },
];
const testimonials = [
  {
    id: 1,
    quote:
      "My order arrived super quickly. The product is even better than I hoped it would be. Very happy customer over here!",
    attribution: "Sarah Peters, New Orleans",
  },
  {
    id: 2,
    quote:
      "I had to return a purchase that didn’t fit. The whole process was so simple that I ended up ordering two new items!",
    attribution: "Kelly McPherson, Chicago",
  },
  {
    id: 3,
    quote:
      "Now that I’m on holiday for the summer, I’ll probably order a few more shirts. It’s just so convenient, and I know the quality will always be there.",
    attribution: "Chris Paul, Phoenix",
  },
];
const footerNavigation = {
  products: [
    { name: "Bags", href: "#" },
    { name: "Tees", href: "#" },
    { name: "Objects", href: "#" },
    { name: "Home Goods", href: "#" },
    { name: "Accessories", href: "#" },
  ],
  customerService: [
    { name: "Contact", href: "#" },
    { name: "Shipping", href: "#" },
    { name: "Returns", href: "#" },
    { name: "Warranty", href: "#" },
    { name: "Secure Payments", href: "#" },
    { name: "FAQ", href: "#" },
    { name: "Find a store", href: "#" },
  ],
  company: [
    { name: "Who we are", href: "#" },
    { name: "Sustainability", href: "#" },
    { name: "Press", href: "#" },
    { name: "Careers", href: "#" },
    { name: "Terms & Conditions", href: "#" },
    { name: "Privacy", href: "#" },
  ],
  legal: [
    { name: "Terms of Service", href: "#" },
    { name: "Return Policy", href: "#" },
    { name: "Privacy Policy", href: "#" },
    { name: "Shipping Policy", href: "#" },
  ],
  bottomLinks: [
    { name: "Accessibility", href: "#" },
    { name: "Privacy", href: "#" },
    { name: "Terms", href: "#" },
  ],
};

/**
 * Tailwind UI – storefront pages: with offers and testimonials.
 *
 * @returns the rendered component.
 */
export function StorefrontPagesWithOffersAndTestimonials() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="bg-white">
      {/* Mobile menu */}
      <Transition.Root show={mobileMenuOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-40 lg:hidden"
          onClose={setMobileMenuOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>

          <div className="fixed inset-0 z-40 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex w-full max-w-xs flex-col overflow-y-auto bg-white pb-12 shadow-xl">
                <div className="flex px-4 pb-2 pt-5">
                  <button
                    type="button"
                    className="-m-2 inline-flex items-center justify-center rounded-md p-2 text-gray-400"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="sr-only">Close menu</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                {/* Links */}
                <Tab.Group as="div" className="mt-2">
                  <div className="border-b border-gray-200">
                    <Tab.List className="-mb-px flex space-x-8 px-4">
                      {navigation.categories.map((category) => (
                        <Tab
                          key={category.name}
                          className={({ selected }) =>
                            classNames(
                              selected
                                ? "border-indigo-600 text-indigo-600"
                                : "border-transparent text-gray-900",
                              "flex-1 whitespace-nowrap border-b-2 px-1 py-4 text-base font-medium"
                            )
                          }
                        >
                          {category.name}
                        </Tab>
                      ))}
                    </Tab.List>
                  </div>
                  <Tab.Panels as={Fragment}>
                    {navigation.categories.map((category, categoryIdx) => (
                      <Tab.Panel
                        key={category.name}
                        className="space-y-12 px-4 pb-6 pt-10"
                      >
                        <div className="grid grid-cols-1 items-start gap-x-6 gap-y-10">
                          <div className="grid grid-cols-1 gap-x-6 gap-y-10">
                            <div>
                              <p
                                id={`mobile-featured-heading-${categoryIdx}`}
                                className="font-medium text-gray-900"
                              >
                                Featured
                              </p>
                              <ul
                                role="list"
                                aria-labelledby={`mobile-featured-heading-${categoryIdx}`}
                                className="mt-6 space-y-6"
                              >
                                {category.featured.map((item) => (
                                  <li key={item.name} className="flex">
                                    <a
                                      href={item.href}
                                      className="text-gray-500"
                                    >
                                      {item.name}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p
                                id="mobile-categories-heading"
                                className="font-medium text-gray-900"
                              >
                                Categories
                              </p>
                              <ul
                                role="list"
                                aria-labelledby="mobile-categories-heading"
                                className="mt-6 space-y-6"
                              >
                                {category.categories.map((item) => (
                                  <li key={item.name} className="flex">
                                    <a
                                      href={item.href}
                                      className="text-gray-500"
                                    >
                                      {item.name}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-x-6 gap-y-10">
                            <div>
                              <p
                                id="mobile-collection-heading"
                                className="font-medium text-gray-900"
                              >
                                Collection
                              </p>
                              <ul
                                role="list"
                                aria-labelledby="mobile-collection-heading"
                                className="mt-6 space-y-6"
                              >
                                {category.collection.map((item) => (
                                  <li key={item.name} className="flex">
                                    <a
                                      href={item.href}
                                      className="text-gray-500"
                                    >
                                      {item.name}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <p
                                id="mobile-brand-heading"
                                className="font-medium text-gray-900"
                              >
                                Brands
                              </p>
                              <ul
                                role="list"
                                aria-labelledby="mobile-brand-heading"
                                className="mt-6 space-y-6"
                              >
                                {category.brands.map((item) => (
                                  <li key={item.name} className="flex">
                                    <a
                                      href={item.href}
                                      className="text-gray-500"
                                    >
                                      {item.name}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </Tab.Panel>
                    ))}
                  </Tab.Panels>
                </Tab.Group>

                <div className="space-y-6 border-t border-gray-200 px-4 py-6">
                  {navigation.pages.map((page) => (
                    <div key={page.name} className="flow-root">
                      <a
                        href={page.href}
                        className="-m-2 block p-2 font-medium text-gray-900"
                      >
                        {page.name}
                      </a>
                    </div>
                  ))}
                </div>

                <div className="space-y-6 border-t border-gray-200 px-4 py-6">
                  <div className="flow-root">
                    <a
                      href="#"
                      className="-m-2 block p-2 font-medium text-gray-900"
                    >
                      Create an account
                    </a>
                  </div>
                  <div className="flow-root">
                    <a
                      href="#"
                      className="-m-2 block p-2 font-medium text-gray-900"
                    >
                      Sign in
                    </a>
                  </div>
                </div>

                <div className="space-y-6 border-t border-gray-200 px-4 py-6">
                  {/* Currency selector */}
                  <form>
                    <div className="inline-block">
                      <label htmlFor="mobile-currency" className="sr-only">
                        Currency
                      </label>
                      <div className="group relative -ml-2 rounded-md border-transparent focus-within:ring-2 focus-within:ring-white">
                        <select
                          id="mobile-currency"
                          name="currency"
                          className="flex items-center rounded-md border-transparent bg-none py-0.5 pl-2 pr-5 text-sm font-medium text-gray-700 focus:border-transparent focus:outline-hidden focus:ring-0 group-hover:text-gray-800"
                        >
                          {currencies.map((currency) => (
                            <option key={currency}>{currency}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
                          <ChevronDownIcon
                            className="h-5 w-5 text-gray-500"
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      <header className="relative z-10">
        <nav aria-label="Top">
          {/* Top navigation */}
          <div className="bg-gray-900">
            <div className="mx-auto flex h-10 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
              {/* Currency selector */}
              <form className="hidden lg:block lg:flex-1">
                <div className="flex">
                  <label htmlFor="desktop-currency" className="sr-only">
                    Currency
                  </label>
                  <div className="group relative -ml-2 rounded-md border-transparent bg-gray-900 focus-within:ring-2 focus-within:ring-white">
                    <select
                      id="desktop-currency"
                      name="currency"
                      className="flex items-center rounded-md border-transparent bg-gray-900 bg-none py-0.5 pl-2 pr-5 text-sm font-medium text-white focus:border-transparent focus:outline-hidden focus:ring-0 group-hover:text-gray-100"
                    >
                      {currencies.map((currency) => (
                        <option key={currency}>{currency}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
                      <ChevronDownIcon
                        className="h-5 w-5 text-gray-300"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>
              </form>

              <p className="flex-1 text-center text-sm font-medium text-white lg:flex-none">
                Get free delivery on orders over $100
              </p>

              <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-end lg:space-x-6">
                <a
                  href="#"
                  className="text-sm font-medium text-white hover:text-gray-100"
                >
                  Create an account
                </a>
                <span className="h-6 w-px bg-gray-600" aria-hidden="true" />
                <a
                  href="#"
                  className="text-sm font-medium text-white hover:text-gray-100"
                >
                  Sign in
                </a>
              </div>
            </div>
          </div>

          {/* Secondary navigation */}
          <div className="bg-white">
            <div className="border-b border-gray-200">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                  {/* Logo (lg+) */}
                  <div className="hidden lg:flex lg:items-center">
                    <a href="#">
                      <span className="sr-only">Your Company</span>
                      <img
                        className="h-8 w-auto"
                        src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
                        alt=""
                      />
                    </a>
                  </div>

                  <div className="hidden h-full lg:flex">
                    {/* Mega menus */}
                    <Popover.Group className="ml-8">
                      <div className="flex h-full justify-center space-x-8">
                        {navigation.categories.map((category, categoryIdx) => (
                          <Popover key={category.name} className="flex">
                            {({ open }) => (
                              <>
                                <div className="relative flex">
                                  <Popover.Button
                                    className={classNames(
                                      open
                                        ? "border-indigo-600 text-indigo-600"
                                        : "border-transparent text-gray-700 hover:text-gray-800",
                                      "relative z-10 -mb-px flex items-center border-b-2 pt-px text-sm font-medium transition-colors duration-200 ease-out"
                                    )}
                                  >
                                    {category.name}
                                  </Popover.Button>
                                </div>

                                <Transition
                                  as={Fragment}
                                  enter="transition ease-out duration-200"
                                  enterFrom="opacity-0"
                                  enterTo="opacity-100"
                                  leave="transition ease-in duration-150"
                                  leaveFrom="opacity-100"
                                  leaveTo="opacity-0"
                                >
                                  <Popover.Panel className="absolute inset-x-0 top-full text-gray-500 sm:text-sm">
                                    {/* Presentational element used to render the bottom shadow, if we put the shadow on the actual panel it pokes out the top, so we use this shorter element to hide the top of the shadow */}
                                    <div
                                      className="absolute inset-0 top-1/2 bg-white shadow-sm"
                                      aria-hidden="true"
                                    />

                                    <div className="relative bg-white">
                                      <div className="mx-auto max-w-7xl px-8">
                                        <div className="grid grid-cols-2 items-start gap-x-8 gap-y-10 pb-12 pt-10">
                                          <div className="grid grid-cols-2 gap-x-8 gap-y-10">
                                            <div>
                                              <p
                                                id={`desktop-featured-heading-${categoryIdx}`}
                                                className="font-medium text-gray-900"
                                              >
                                                Featured
                                              </p>
                                              <ul
                                                role="list"
                                                aria-labelledby={`desktop-featured-heading-${categoryIdx}`}
                                                className="mt-6 space-y-6 sm:mt-4 sm:space-y-4"
                                              >
                                                {category.featured.map(
                                                  (item) => (
                                                    <li
                                                      key={item.name}
                                                      className="flex"
                                                    >
                                                      <a
                                                        href={item.href}
                                                        className="hover:text-gray-800"
                                                      >
                                                        {item.name}
                                                      </a>
                                                    </li>
                                                  )
                                                )}
                                              </ul>
                                            </div>
                                            <div>
                                              <p
                                                id="desktop-categories-heading"
                                                className="font-medium text-gray-900"
                                              >
                                                Categories
                                              </p>
                                              <ul
                                                role="list"
                                                aria-labelledby="desktop-categories-heading"
                                                className="mt-6 space-y-6 sm:mt-4 sm:space-y-4"
                                              >
                                                {category.categories.map(
                                                  (item) => (
                                                    <li
                                                      key={item.name}
                                                      className="flex"
                                                    >
                                                      <a
                                                        href={item.href}
                                                        className="hover:text-gray-800"
                                                      >
                                                        {item.name}
                                                      </a>
                                                    </li>
                                                  )
                                                )}
                                              </ul>
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 gap-x-8 gap-y-10">
                                            <div>
                                              <p
                                                id="desktop-collection-heading"
                                                className="font-medium text-gray-900"
                                              >
                                                Collection
                                              </p>
                                              <ul
                                                role="list"
                                                aria-labelledby="desktop-collection-heading"
                                                className="mt-6 space-y-6 sm:mt-4 sm:space-y-4"
                                              >
                                                {category.collection.map(
                                                  (item) => (
                                                    <li
                                                      key={item.name}
                                                      className="flex"
                                                    >
                                                      <a
                                                        href={item.href}
                                                        className="hover:text-gray-800"
                                                      >
                                                        {item.name}
                                                      </a>
                                                    </li>
                                                  )
                                                )}
                                              </ul>
                                            </div>

                                            <div>
                                              <p
                                                id="desktop-brand-heading"
                                                className="font-medium text-gray-900"
                                              >
                                                Brands
                                              </p>
                                              <ul
                                                role="list"
                                                aria-labelledby="desktop-brand-heading"
                                                className="mt-6 space-y-6 sm:mt-4 sm:space-y-4"
                                              >
                                                {category.brands.map((item) => (
                                                  <li
                                                    key={item.name}
                                                    className="flex"
                                                  >
                                                    <a
                                                      href={item.href}
                                                      className="hover:text-gray-800"
                                                    >
                                                      {item.name}
                                                    </a>
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </Popover.Panel>
                                </Transition>
                              </>
                            )}
                          </Popover>
                        ))}

                        {navigation.pages.map((page) => (
                          <a
                            key={page.name}
                            href={page.href}
                            className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-800"
                          >
                            {page.name}
                          </a>
                        ))}
                      </div>
                    </Popover.Group>
                  </div>

                  {/* Mobile menu and search (lg-) */}
                  <div className="flex flex-1 items-center lg:hidden">
                    <button
                      type="button"
                      className="-ml-2 rounded-md bg-white p-2 text-gray-400"
                      onClick={() => setMobileMenuOpen(true)}
                    >
                      <span className="sr-only">Open menu</span>
                      <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                    </button>

                    {/* Search */}
                    <a
                      href="#"
                      className="ml-2 p-2 text-gray-400 hover:text-gray-500"
                    >
                      <span className="sr-only">Search</span>
                      <MagnifyingGlassIcon
                        className="h-6 w-6"
                        aria-hidden="true"
                      />
                    </a>
                  </div>

                  {/* Logo (lg-) */}
                  <a href="#" className="lg:hidden">
                    <span className="sr-only">Your Company</span>
                    <img
                      src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
                      alt=""
                      className="h-8 w-auto"
                    />
                  </a>

                  <div className="flex flex-1 items-center justify-end">
                    <div className="flex items-center lg:ml-8">
                      <div className="flex space-x-8">
                        <div className="hidden lg:flex">
                          <a
                            href="#"
                            className="-m-2 p-2 text-gray-400 hover:text-gray-500"
                          >
                            <span className="sr-only">Search</span>
                            <MagnifyingGlassIcon
                              className="h-6 w-6"
                              aria-hidden="true"
                            />
                          </a>
                        </div>

                        <div className="flex">
                          <a
                            href="#"
                            className="-m-2 p-2 text-gray-400 hover:text-gray-500"
                          >
                            <span className="sr-only">Account</span>
                            <UserIcon className="h-6 w-6" aria-hidden="true" />
                          </a>
                        </div>
                      </div>

                      <span
                        className="mx-4 h-6 w-px bg-gray-200 lg:mx-6"
                        aria-hidden="true"
                      />

                      <div className="flow-root">
                        <a
                          href="#"
                          className="group -m-2 flex items-center p-2"
                        >
                          <ShoppingCartIcon
                            className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-gray-500"
                            aria-hidden="true"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-gray-800">
                            0
                          </span>
                          <span className="sr-only">
                            items in cart, view bag
                          </span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <div className="flex flex-col border-b border-gray-200 lg:border-0">
          <nav aria-label="Offers" className="order-last lg:order-first">
            <div className="mx-auto max-w-7xl lg:px-8">
              <ul
                role="list"
                className="grid grid-cols-1 divide-y divide-gray-200 lg:grid-cols-3 lg:divide-x lg:divide-y-0"
              >
                {offers.map((offer) => (
                  <li key={offer.name} className="flex flex-col">
                    <a
                      href={offer.href}
                      className="relative flex flex-1 flex-col justify-center bg-white px-4 py-6 text-center focus:z-10"
                    >
                      <p className="text-sm text-gray-500">{offer.name}</p>
                      <p className="font-semibold text-gray-900">
                        {offer.description}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute hidden h-full w-1/2 bg-gray-100 lg:block"
            />
            <div className="relative bg-gray-100 lg:bg-transparent">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:grid lg:grid-cols-2 lg:px-8">
                <div className="mx-auto max-w-2xl py-24 lg:max-w-none lg:py-64">
                  <div className="lg:pr-16">
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl xl:text-6xl">
                      Focus on what matters
                    </h1>
                    <p className="mt-4 text-xl text-gray-600">
                      All the charts, datepickers, and notifications in the
                      world can't beat checking off some items on a paper card.
                    </p>
                    <div className="mt-6">
                      <a
                        href="#"
                        className="inline-block rounded-md border border-transparent bg-indigo-600 px-8 py-3 font-medium text-white hover:bg-indigo-700"
                      >
                        Shop Productivity
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-48 w-full sm:h-64 lg:absolute lg:right-0 lg:top-0 lg:h-full lg:w-1/2">
              <img
                src="https://tailwindui.com/img/ecommerce-images/home-page-02-hero-half-width.jpg"
                alt=""
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>
        </div>

        {/* Trending products */}
        <section aria-labelledby="trending-heading" className="bg-white">
          <div className="py-16 sm:py-24 lg:mx-auto lg:max-w-7xl lg:px-8 lg:py-32">
            <div className="flex items-center justify-between px-4 sm:px-6 lg:px-0">
              <h2
                id="trending-heading"
                className="text-2xl font-bold tracking-tight text-gray-900"
              >
                Trending products
              </h2>
              <a
                href="#"
                className="hidden text-sm font-semibold text-indigo-600 hover:text-indigo-500 sm:block"
              >
                See everything
                <span aria-hidden="true"> &rarr;</span>
              </a>
            </div>

            <div className="relative mt-8">
              <div className="relative w-full overflow-x-auto">
                <ul
                  role="list"
                  className="mx-4 inline-flex space-x-8 sm:mx-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-x-8 lg:space-x-0"
                >
                  {trendingProducts.map((product) => (
                    <li
                      key={product.id}
                      className="inline-flex w-64 flex-col text-center lg:w-auto"
                    >
                      <div className="group relative">
                        <div className="aspect-[1/1] w-full overflow-hidden rounded-md bg-gray-200">
                          <img
                            src={product.imageSrc}
                            alt={product.imageAlt}
                            className="h-full w-full object-cover object-center group-hover:opacity-75"
                          />
                        </div>
                        <div className="mt-6">
                          <p className="text-sm text-gray-500">
                            {product.color}
                          </p>
                          <h3 className="mt-1 font-semibold text-gray-900">
                            <a href={product.href}>
                              <span className="absolute inset-0" />
                              {product.name}
                            </a>
                          </h3>
                          <p className="mt-1 text-gray-900">{product.price}</p>
                        </div>
                      </div>

                      <h4 className="sr-only">Available colors</h4>
                      <ul
                        role="list"
                        className="mt-auto flex items-center justify-center space-x-3 pt-6"
                      >
                        {product.availableColors.map((color) => (
                          <li
                            key={color.name}
                            className="h-4 w-4 rounded-full border border-black/10"
                            style={{ backgroundColor: color.colorBg }}
                          >
                            <span className="sr-only">{color.name}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-12 px-4 sm:hidden">
              <a
                href="#"
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
              >
                See everything
                <span aria-hidden="true"> &rarr;</span>
              </a>
            </div>
          </div>
        </section>

        {/* Collections */}
        <section aria-labelledby="collections-heading" className="bg-gray-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl py-16 sm:py-24 lg:max-w-none lg:py-32">
              <h2
                id="collections-heading"
                className="text-2xl font-bold text-gray-900"
              >
                Collections
              </h2>

              <div className="mt-6 space-y-12 lg:grid lg:grid-cols-3 lg:gap-x-6 lg:space-y-0">
                {collections.map((collection) => (
                  <div key={collection.name} className="group relative">
                    <div className="relative h-80 w-full overflow-hidden rounded-lg bg-white lg:aspect-[1/1] group-hover:opacity-75 sm:h-64">
                      <img
                        src={collection.imageSrc}
                        alt={collection.imageAlt}
                        className="h-full w-full object-cover object-center"
                      />
                    </div>
                    <h3 className="mt-6 text-sm text-gray-500">
                      <a href={collection.href}>
                        <span className="absolute inset-0" />
                        {collection.name}
                      </a>
                    </h3>
                    <p className="text-base font-semibold text-gray-900">
                      {collection.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Sale and testimonials */}
        <div className="relative overflow-hidden">
          {/* Decorative background image and gradient */}
          <div aria-hidden="true" className="absolute inset-0">
            <div className="absolute inset-0 mx-auto max-w-7xl overflow-hidden xl:px-8">
              <img
                src="https://tailwindui.com/img/ecommerce-images/home-page-02-sale-full-width.jpg"
                alt=""
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="absolute inset-0 bg-white/75" />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white" />
          </div>

          {/* Sale */}
          <section
            aria-labelledby="sale-heading"
            className="relative mx-auto flex max-w-7xl flex-col items-center px-4 pt-32 text-center sm:px-6 lg:px-8"
          >
            <div className="mx-auto max-w-2xl lg:max-w-none">
              <h2
                id="sale-heading"
                className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
              >
                Get 25% off during our one-time sale
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-xl text-gray-600">
                Most of our products are limited releases that won't come back.
                Get your favorite items while they're in stock.
              </p>
              <a
                href="#"
                className="mt-6 inline-block w-full rounded-md border border-transparent bg-gray-900 px-8 py-3 font-medium text-white hover:bg-gray-800 sm:w-auto"
              >
                Get access to our one-time sale
              </a>
            </div>
          </section>

          {/* Testimonials */}
          <section
            aria-labelledby="testimonial-heading"
            className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32"
          >
            <div className="mx-auto max-w-2xl lg:max-w-none">
              <h2
                id="testimonial-heading"
                className="text-2xl font-bold tracking-tight text-gray-900"
              >
                What are people saying?
              </h2>

              <div className="mt-16 space-y-16 lg:grid lg:grid-cols-3 lg:gap-x-8 lg:space-y-0">
                {testimonials.map((testimonial) => (
                  <blockquote key={testimonial.id} className="sm:flex lg:block">
                    <svg
                      width={24}
                      height={18}
                      viewBox="0 0 24 18"
                      aria-hidden="true"
                      className="shrink-0 text-gray-300"
                    >
                      <path
                        d="M0 18h8.7v-5.555c-.024-3.906 1.113-6.841 2.892-9.68L6.452 0C3.188 2.644-.026 7.86 0 12.469V18zm12.408 0h8.7v-5.555C21.083 8.539 22.22 5.604 24 2.765L18.859 0c-3.263 2.644-6.476 7.86-6.451 12.469V18z"
                        fill="currentColor"
                      />
                    </svg>
                    <div className="mt-8 sm:ml-6 sm:mt-0 lg:ml-0 lg:mt-10">
                      <p className="text-lg text-gray-600">
                        {testimonial.quote}
                      </p>
                      <cite className="mt-4 block font-semibold not-italic text-gray-900">
                        {testimonial.attribution}
                      </cite>
                    </div>
                  </blockquote>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer aria-labelledby="footer-heading" className="bg-white">
        <h2 id="footer-heading" className="sr-only">
          Footer
        </h2>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="border-t border-gray-200">
            <div className="pb-20 pt-16">
              <div className="md:flex md:justify-center">
                <img
                  src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
                  alt=""
                  className="h-8 w-auto"
                />
              </div>
              <div className="mx-auto mt-16 max-w-5xl xl:grid xl:grid-cols-2 xl:gap-8">
                <div className="grid grid-cols-2 gap-8 xl:col-span-2">
                  <div className="space-y-12 md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        Products
                      </h3>
                      <ul role="list" className="mt-6 space-y-6">
                        {footerNavigation.products.map((item) => (
                          <li key={item.name} className="text-sm">
                            <a
                              href={item.href}
                              className="text-gray-500 hover:text-gray-600"
                            >
                              {item.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        Customer Service
                      </h3>
                      <ul role="list" className="mt-6 space-y-6">
                        {footerNavigation.customerService.map((item) => (
                          <li key={item.name} className="text-sm">
                            <a
                              href={item.href}
                              className="text-gray-500 hover:text-gray-600"
                            >
                              {item.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="space-y-12 md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        Company
                      </h3>
                      <ul role="list" className="mt-6 space-y-6">
                        {footerNavigation.company.map((item) => (
                          <li key={item.name} className="text-sm">
                            <a
                              href={item.href}
                              className="text-gray-500 hover:text-gray-600"
                            >
                              {item.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        Legal
                      </h3>
                      <ul role="list" className="mt-6 space-y-6">
                        {footerNavigation.legal.map((item) => (
                          <li key={item.name} className="text-sm">
                            <a
                              href={item.href}
                              className="text-gray-500 hover:text-gray-600"
                            >
                              {item.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:grid lg:grid-cols-2 lg:gap-x-6 xl:gap-x-8">
              <div className="flex items-center rounded-lg bg-gray-100 p-6 sm:p-10">
                <div className="mx-auto max-w-sm">
                  <h3 className="font-semibold text-gray-900">
                    Sign up for our newsletter
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    The latest news, articles, and resources, sent to your inbox
                    weekly.
                  </p>
                  <form className="mt-4 sm:mt-6 sm:flex">
                    <label htmlFor="email-address" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="email-address"
                      type="text"
                      autoComplete="email"
                      required
                      className="w-full min-w-0 appearance-none rounded-md border border-gray-300 bg-white px-4 py-2 text-base text-gray-900 placeholder-gray-500 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="mt-3 sm:ml-4 sm:mt-0 sm:shrink-0">
                      <button
                        type="submit"
                        className="flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-xs hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white"
                      >
                        Sign up
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="relative mt-6 flex items-center px-6 py-12 sm:px-10 sm:py-16 lg:mt-0">
                <div className="absolute inset-0 overflow-hidden rounded-lg">
                  <img
                    src="https://tailwindui.com/img/ecommerce-images/footer-02-exclusive-sale.jpg"
                    alt=""
                    className="h-full w-full object-cover object-center saturate-0 filter"
                  />
                  <div className="absolute inset-0 bg-indigo-600/90" />
                </div>
                <div className="relative mx-auto max-w-sm text-center">
                  <h3 className="text-2xl font-bold tracking-tight text-white">
                    Get early access
                  </h3>
                  <p className="mt-2 text-gray-200">
                    Did you sign up to the newsletter? If so, use the keyword we
                    sent you to get access.{" "}
                    <a
                      href="#"
                      className="whitespace-nowrap font-bold text-white hover:text-gray-200"
                    >
                      Go now<span aria-hidden="true"> &rarr;</span>
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="py-10 md:flex md:items-center md:justify-between">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-500">
                &copy; 2021 All Rights Reserved
              </p>
            </div>

            <div className="mt-4 flex items-center justify-center md:mt-0">
              <div className="flex space-x-8">
                {footerNavigation.bottomLinks.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="text-sm text-gray-500 hover:text-gray-600"
                  >
                    {item.name}
                  </a>
                ))}
              </div>

              <div className="ml-6 border-l border-gray-200 pl-6">
                <a
                  href="#"
                  className="flex items-center text-gray-500 hover:text-gray-600"
                >
                  <img
                    src="https://tailwindui.com/img/flags/flag-canada.svg"
                    alt=""
                    className="h-auto w-5 shrink-0"
                  />
                  <span className="ml-3 text-sm">Change</span>
                  <span className="sr-only">location and currency</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
