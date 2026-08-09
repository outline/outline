import { MarketingLayout } from "./MarketingLayout";

const PLATFORMS = [
  {
    name: "Windows",
    detail: "Windows 10 and later, 64-bit",
    action: "Download for Windows",
  },
  {
    name: "macOS",
    detail: "macOS 12 and later, Apple silicon and Intel",
    action: "Download for Mac",
  },
  {
    name: "Android",
    detail: "Android 9 and later — take the till to the floor",
    action: "Get it on Android",
  },
  {
    name: "iOS",
    detail: "iOS 15 and later",
    action: "Get it on iOS",
  },
];

/**
 * Where to get the apps.
 *
 * The buttons are inert: there are no builds to hand out yet, and a link that
 * downloads nothing is worse than one that says so.
 *
 * @returns the rendered download page.
 */
function Download() {
  return (
    <MarketingLayout
      title="Download"
      description="Use it in the browser, or install it on the counter."
    >
      <ul role="list" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PLATFORMS.map((platform) => (
          <li
            key={platform.name}
            className="rounded-lg border border-gray-200 p-5"
          >
            <p className="text-sm font-semibold text-gray-900">
              {platform.name}
            </p>
            <p className="mt-1 text-sm text-gray-600">{platform.detail}</p>
            <button
              type="button"
              disabled
              title="Not available yet"
              className="mt-4 rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-400"
            >
              {platform.action}
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-gray-500">
        Builds aren&rsquo;t published yet — everything works in the browser in
        the meantime.
      </p>
    </MarketingLayout>
  );
}

export default Download;
