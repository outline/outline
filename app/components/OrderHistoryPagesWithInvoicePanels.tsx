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
import { Fragment } from "react";
import { Menu, Popover, Transition } from "@headlessui/react";
import {
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { classNames } from "./classNames";

const navigation = {
  categories: [
    {
      name: "Women",
      clothing: [
        [
          { name: "Tops", href: "#" },
          { name: "Dresses", href: "#" },
          { name: "Pants", href: "#" },
          { name: "Denim", href: "#" },
          { name: "Sweaters", href: "#" },
          { name: "T-Shirts", href: "#" },
        ],
        [
          { name: "Jackets", href: "#" },
          { name: "Activewear", href: "#" },
          { name: "Shorts", href: "#" },
          { name: "Swimwear", href: "#" },
          { name: "Browse All", href: "#" },
        ],
      ],
      accessories: [
        { name: "Shoes", href: "#" },
        { name: "Jewelry", href: "#" },
        { name: "Handbags", href: "#" },
        { name: "Socks", href: "#" },
        { name: "Hats", href: "#" },
        { name: "Browse All", href: "#" },
      ],
      categories: [
        { name: "New Arrivals", href: "#" },
        { name: "Sale", href: "#" },
        { name: "Basic Tees", href: "#" },
        { name: "Artwork Tees", href: "#" },
      ],
    },
    {
      name: "Men",
      clothing: [
        [
          { name: "Dress Shirts", href: "#" },
          { name: "Pants", href: "#" },
          { name: "Jackets", href: "#" },
          { name: "T-Shirts", href: "#" },
          { name: "Jeans", href: "#" },
          { name: "Hoodies", href: "#" },
        ],
        [
          { name: "Vests", href: "#" },
          { name: "Kilts", href: "#" },
          { name: "Outdoors", href: "#" },
          { name: "Capes", href: "#" },
          { name: "Browse All", href: "#" },
        ],
      ],
      accessories: [
        { name: "Watches", href: "#" },
        { name: "Boots", href: "#" },
        { name: "Fanny Packs", href: "#" },
        { name: "Sunglasses", href: "#" },
        { name: "Browse All", href: "#" },
      ],
      categories: [
        { name: "Just Added", href: "#" },
        { name: "Clearance", href: "#" },
        { name: "Graphic Tees", href: "#" },
      ],
    },
  ],
  other: [
    { name: "Company", href: "#" },
    { name: "Stores", href: "#" },
  ],
};
const orders = [
  {
    number: "WU88191111",
    href: "#",
    invoiceHref: "#",
    createdDate: "Jul 6, 2021",
    createdDatetime: "2021-07-06",
    deliveredDate: "July 12, 2021",
    deliveredDatetime: "2021-07-12",
    total: "$160.00",
    products: [
      {
        id: 1,
        name: "Micro Backpack",
        description:
          "Are you a minimalist looking for a compact carry option? The Micro Backpack is the perfect size for your essential everyday carry items. Wear it like a backpack or carry it like a satchel for all-day use.",
        href: "#",
        price: "$70.00",
        imageSrc:
          "https://tailwindui.com/img/ecommerce-images/order-history-page-03-product-01.jpg",
        imageAlt:
          "Moss green canvas compact backpack with double top zipper, zipper front pouch, and matching carry handle and backpack straps.",
      },
      // More products...
    ],
  },
  // More orders...
];
const footerNavigation = {
  products: [
    { name: "Bags", href: "#" },
    { name: "Tees", href: "#" },
    { name: "Objects", href: "#" },
    { name: "Home Goods", href: "#" },
    { name: "Accessories", href: "#" },
  ],
  company: [
    { name: "Who we are", href: "#" },
    { name: "Sustainability", href: "#" },
    { name: "Press", href: "#" },
    { name: "Careers", href: "#" },
    { name: "Terms & Conditions", href: "#" },
    { name: "Privacy", href: "#" },
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
};

/**
 * Tailwind UI – order history pages: with invoice panels.
 *
 * @returns the rendered component.
 */
export function OrderHistoryPagesWithInvoicePanels() {
  return (
    <div className="bg-gray-50">
      <header className="relative bg-white shadow-xs">
        <nav aria-label="Top" className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="px-4 pb-14 sm:px-0 sm:pb-0">
            <div className="flex h-16 items-center justify-between">
              {/* Logo */}
              <div className="flex flex-1">
                <a href="#">
                  <span className="sr-only">Your Company</span>
                  <img
                    className="h-8 w-auto"
                    src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
                    alt=""
                  />
                </a>
              </div>

              {/* Flyout menus */}
              <Popover.Group className="absolute inset-x-0 bottom-0 sm:static sm:flex-1 sm:self-stretch">
                <div className="flex h-14 space-x-8 overflow-x-auto border-t px-4 pb-px sm:h-full sm:justify-center sm:overflow-visible sm:border-t-0 sm:pb-0">
                  {navigation.categories.map((category, categoryIdx) => (
                    <Popover key={categoryIdx} className="flex">
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
                            <Popover.Panel className="absolute inset-x-0 top-full z-20 bg-white text-gray-500 sm:text-sm">
                              {/* Presentational element used to render the bottom shadow, if we put the shadow on the actual panel it pokes out the top, so we use this shorter element to hide the top of the shadow */}
                              <div
                                className="absolute inset-0 top-1/2 bg-white shadow-sm"
                                aria-hidden="true"
                              />
                              {/* Fake border when menu is open */}
                              <div
                                className="absolute inset-0 -top-px mx-auto h-px max-w-7xl sm:top-0 sm:px-6 lg:px-8"
                                aria-hidden="true"
                              >
                                <div
                                  className={classNames(
                                    open ? "bg-gray-200" : "bg-transparent",
                                    "h-px w-full transition-colors duration-200 ease-out"
                                  )}
                                />
                              </div>

                              <div className="relative">
                                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                                  <div className="grid grid-cols-1 items-start gap-x-6 gap-y-10 pb-12 pt-10 md:grid-cols-2 lg:gap-x-8">
                                    <div className="grid grid-cols-1 gap-x-6 gap-y-10 lg:gap-x-8">
                                      <div>
                                        <p
                                          id="clothing-heading"
                                          className="font-medium text-gray-900"
                                        >
                                          Clothing
                                        </p>
                                        <div className="mt-4 border-t border-gray-200 pt-6 sm:grid sm:grid-cols-2 sm:gap-x-6">
                                          <ul
                                            role="list"
                                            aria-labelledby="clothing-heading"
                                            className="space-y-6 sm:space-y-4"
                                          >
                                            {category.clothing[0].map(
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
                                          <ul
                                            role="list"
                                            aria-label="More clothing"
                                            className="mt-6 space-y-6 sm:mt-0 sm:space-y-4"
                                          >
                                            {category.clothing[1].map(
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
                                    </div>
                                    <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:gap-x-8">
                                      <div>
                                        <p
                                          id="accessories-heading"
                                          className="font-medium text-gray-900"
                                        >
                                          Accessories
                                        </p>
                                        <ul
                                          role="list"
                                          aria-labelledby="accessories-heading"
                                          className="mt-4 space-y-6 border-t border-gray-200 pt-6 sm:space-y-4"
                                        >
                                          {category.accessories.map((item) => (
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
                                      <div>
                                        <p
                                          id="categories-heading"
                                          className="font-medium text-gray-900"
                                        >
                                          Categories
                                        </p>
                                        <ul
                                          role="list"
                                          aria-labelledby="categories-heading"
                                          className="mt-4 space-y-6 border-t border-gray-200 pt-6 sm:space-y-4"
                                        >
                                          {category.categories.map((item) => (
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

                  {navigation.other.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-800"
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
              </Popover.Group>

              <div className="flex flex-1 items-center justify-end">
                {/* Search */}
                <a href="#" className="p-2 text-gray-400 hover:text-gray-500">
                  <span className="sr-only">Search</span>
                  <MagnifyingGlassIcon className="h-6 w-6" aria-hidden="true" />
                </a>

                {/* Cart */}
                <div className="ml-4 flow-root lg:ml-8">
                  <a href="#" className="group -m-2 flex items-center p-2">
                    <ShoppingBagIcon
                      className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-gray-500"
                      aria-hidden="true"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-gray-800">
                      0
                    </span>
                    <span className="sr-only">items in cart, view bag</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main className="py-24">
        <div className="mx-auto max-w-7xl sm:px-2 lg:px-8">
          <div className="mx-auto max-w-2xl px-4 lg:max-w-4xl lg:px-0">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Order history
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Check the status of recent orders, manage returns, and discover
              similar products.
            </p>
          </div>
        </div>

        <section aria-labelledby="recent-heading" className="mt-16">
          <h2 id="recent-heading" className="sr-only">
            Recent orders
          </h2>
          <div className="mx-auto max-w-7xl sm:px-2 lg:px-8">
            <div className="mx-auto max-w-2xl space-y-8 sm:px-4 lg:max-w-4xl lg:px-0">
              {orders.map((order) => (
                <div
                  key={order.number}
                  className="border-b border-t border-gray-200 bg-white shadow-xs sm:rounded-lg sm:border"
                >
                  <h3 className="sr-only">
                    Order placed on{" "}
                    <time dateTime={order.createdDatetime}>
                      {order.createdDate}
                    </time>
                  </h3>

                  <div className="flex items-center border-b border-gray-200 p-4 sm:grid sm:grid-cols-4 sm:gap-x-6 sm:p-6">
                    <dl className="grid flex-1 grid-cols-2 gap-x-6 text-sm sm:col-span-3 sm:grid-cols-3 lg:col-span-2">
                      <div>
                        <dt className="font-medium text-gray-900">
                          Order number
                        </dt>
                        <dd className="mt-1 text-gray-500">{order.number}</dd>
                      </div>
                      <div className="hidden sm:block">
                        <dt className="font-medium text-gray-900">
                          Date placed
                        </dt>
                        <dd className="mt-1 text-gray-500">
                          <time dateTime={order.createdDatetime}>
                            {order.createdDate}
                          </time>
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-900">
                          Total amount
                        </dt>
                        <dd className="mt-1 font-medium text-gray-900">
                          {order.total}
                        </dd>
                      </div>
                    </dl>

                    <Menu
                      as="div"
                      className="relative flex justify-end lg:hidden"
                    >
                      <div className="flex items-center">
                        <Menu.Button className="-m-2 flex items-center p-2 text-gray-400 hover:text-gray-500">
                          <span className="sr-only">
                            Options for order {order.number}
                          </span>
                          <EllipsisVerticalIcon
                            className="h-6 w-6"
                            aria-hidden="true"
                          />
                        </Menu.Button>
                      </div>

                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute right-0 z-10 mt-2 w-40 origin-bottom-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-hidden">
                          <div className="py-1">
                            <Menu.Item>
                              {({ active }) => (
                                <a
                                  href={order.href}
                                  className={classNames(
                                    active
                                      ? "bg-gray-100 text-gray-900"
                                      : "text-gray-700",
                                    "block px-4 py-2 text-sm"
                                  )}
                                >
                                  View
                                </a>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <a
                                  href={order.invoiceHref}
                                  className={classNames(
                                    active
                                      ? "bg-gray-100 text-gray-900"
                                      : "text-gray-700",
                                    "block px-4 py-2 text-sm"
                                  )}
                                >
                                  Invoice
                                </a>
                              )}
                            </Menu.Item>
                          </div>
                        </Menu.Items>
                      </Transition>
                    </Menu>

                    <div className="hidden lg:col-span-2 lg:flex lg:items-center lg:justify-end lg:space-x-4">
                      <a
                        href={order.href}
                        className="flex items-center justify-center rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      >
                        <span>View Order</span>
                        <span className="sr-only">{order.number}</span>
                      </a>
                      <a
                        href={order.invoiceHref}
                        className="flex items-center justify-center rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      >
                        <span>View Invoice</span>
                        <span className="sr-only">
                          for order {order.number}
                        </span>
                      </a>
                    </div>
                  </div>

                  {/* Products */}
                  <h4 className="sr-only">Items</h4>
                  <ul role="list" className="divide-y divide-gray-200">
                    {order.products.map((product) => (
                      <li key={product.id} className="p-4 sm:p-6">
                        <div className="flex items-center sm:items-start">
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-200 sm:h-40 sm:w-40">
                            <img
                              src={product.imageSrc}
                              alt={product.imageAlt}
                              className="h-full w-full object-cover object-center"
                            />
                          </div>
                          <div className="ml-6 flex-1 text-sm">
                            <div className="font-medium text-gray-900 sm:flex sm:justify-between">
                              <h5>{product.name}</h5>
                              <p className="mt-2 sm:mt-0">{product.price}</p>
                            </div>
                            <p className="hidden text-gray-500 sm:mt-2 sm:block">
                              {product.description}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 sm:flex sm:justify-between">
                          <div className="flex items-center">
                            <CheckCircleIcon
                              className="h-5 w-5 text-green-500"
                              aria-hidden="true"
                            />
                            <p className="ml-2 text-sm font-medium text-gray-500">
                              Delivered on{" "}
                              <time dateTime={order.deliveredDatetime}>
                                {order.deliveredDate}
                              </time>
                            </p>
                          </div>

                          <div className="mt-6 flex items-center space-x-4 divide-x divide-gray-200 border-t border-gray-200 pt-4 text-sm font-medium sm:ml-4 sm:mt-0 sm:border-none sm:pt-0">
                            <div className="flex flex-1 justify-center">
                              <a
                                href={product.href}
                                className="whitespace-nowrap text-indigo-600 hover:text-indigo-500"
                              >
                                View product
                              </a>
                            </div>
                            <div className="flex flex-1 justify-center pl-4">
                              <a
                                href="#"
                                className="whitespace-nowrap text-indigo-600 hover:text-indigo-500"
                              >
                                Buy again
                              </a>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer
        aria-labelledby="footer-heading"
        className="border-t border-gray-200 bg-white"
      >
        <h2 id="footer-heading" className="sr-only">
          Footer
        </h2>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-20">
            <div className="grid grid-cols-1 md:grid-flow-col md:auto-rows-min md:grid-cols-12 md:gap-x-8 md:gap-y-16">
              {/* Image section */}
              <div className="col-span-1 md:col-span-2 lg:col-start-1 lg:row-start-1">
                <img
                  src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
                  alt=""
                  className="h-8 w-auto"
                />
              </div>

              {/* Sitemap sections */}
              <div className="col-span-6 mt-10 grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-8 md:col-start-3 md:row-start-1 md:mt-0 lg:col-span-6 lg:col-start-2">
                <div className="grid grid-cols-1 gap-y-12 sm:col-span-2 sm:grid-cols-2 sm:gap-x-8">
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

              {/* Newsletter section */}
              <div className="mt-12 md:col-span-8 md:col-start-3 md:row-start-2 md:mt-0 lg:col-span-4 lg:col-start-9 lg:row-start-1">
                <h3 className="text-sm font-medium text-gray-900">
                  Sign up for our newsletter
                </h3>
                <p className="mt-6 text-sm text-gray-500">
                  The latest deals and savings, sent to your inbox weekly.
                </p>
                <form className="mt-2 flex sm:max-w-md">
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
                  <div className="ml-4 shrink-0">
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-xs hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      Sign up
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 py-10 text-center">
            <p className="text-sm text-gray-500">
              &copy; 2021 Your Company, Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
