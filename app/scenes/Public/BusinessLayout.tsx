import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageTitle from "~/components/PageTitle";
import { client } from "~/utils/ApiClient";
/** A shopfront as a visitor sees it. */
export interface Business {
  slug: string;
  name: string;
  tagline: string;
  address: string;
  phone: string;
  hours: string;
}
/**
 * Loads the business named in the url.
 *
 * @returns the business, and whether the lookup has finished.
 */
export function useBusiness() {
  const { businessSlug } = useParams<{
    businessSlug: string;
  }>();
  const [business, setBusiness] = useState<Business | null>();
  useEffect(() => {
    let cancelled = false;
    void client
      .post("/public.business", { slug: businessSlug })
      .then((response) => {
        if (!cancelled) {
          setBusiness(response.data ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBusiness(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [businessSlug]);
  return { business, slug: businessSlug };
}
interface Props {
  children: ReactNode;
  /** The tab to mark as current. */
  current: "booking" | "boarding" | "featured";
}
const TABS = [
  { key: "booking", label: "Book" },
  { key: "boarding", label: "Boarding" },
  { key: "featured", label: "Shop" },
] as const;
/**
 * Chrome for the public, per-business pages.
 *
 * These render for visitors who are not signed in, so they deliberately carry
 * none of the app shell – no sidebar, no workspace navigation – just the
 * shopfront for one business.
 *
 * @returns the rendered public layout.
 */
export function BusinessLayout({ children, current }: Props) {
  const { business, slug } = useBusiness();
  if (business === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-sm text-gray-500">
        Loading…
      </div>
    );
  }
  if (business === null) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <PageTitle title="Not found" />
        <h1 className="text-2xl font-bold text-gray-900">
          We couldn&rsquo;t find that business
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Check the link and try again.
        </p>
      </div>
    );
  }
  return (
    <div className="min-h-full bg-white">
      <PageTitle title={business.name} />
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {business.name}
          </h1>
          <p className="mt-2 text-sm text-gray-600">{business.tagline}</p>
          <p className="mt-4 text-xs text-gray-500">
            {business.address} · {business.phone} · {business.hours}
          </p>

          <nav className="mt-6 flex gap-6" aria-label="Sections">
            {TABS.map((tab) => (
              <Link
                key={tab.key}
                to={`/p/${slug}/${tab.key}`}
                className={`border-b-2 pb-2 text-sm font-medium ${
                  current === tab.key
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </div>
  );
}
