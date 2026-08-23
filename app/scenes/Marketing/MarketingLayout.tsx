import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import PageTitle from "~/components/PageTitle";
const NAV = [
  { to: "/docs", label: "Docs" },
  { to: "/download", label: "Download" },
  { to: "/contact", label: "Contact" },
];
const FOOTER = [
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/contact", label: "Contact" },
];
interface Props {
  /** Page heading, also used for the browser tab. */
  title: string;
  /** Short line under the heading. */
  description?: string;
  children: ReactNode;
}
/**
 * Chrome for the public content pages.
 *
 * These are read by people with no account, so like the shopfront they carry
 * none of the app shell – just a header, the content, and a footer.
 *
 * @returns the rendered marketing layout.
 */
export function MarketingLayout({ title, description, children }: Props) {
  return (
    <div className="min-h-full bg-white">
      <PageTitle title={title} />

      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/docs" className="text-sm font-semibold text-gray-900">
            Acme Pet Care
          </Link>
          <nav className="flex items-center gap-6" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/login"
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 text-base text-gray-600">{description}</p>
        ) : null}
        <div className="mt-10">{children}</div>
      </main>

      <footer className="border-t border-gray-200">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Acme Pet Care</p>
          <nav className="flex gap-6" aria-label="Footer">
            {FOOTER.map((item) => (
              <Link key={item.to} to={item.to} className="hover:text-gray-900">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
