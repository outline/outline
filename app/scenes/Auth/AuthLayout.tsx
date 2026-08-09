import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import PageTitle from "~/components/PageTitle";

interface Props {
  /** Heading for the form. */
  title: string;
  /** Short line under the heading. */
  description?: string;
  children: ReactNode;
  /** Link shown under the card. */
  footer?: ReactNode;
}

/**
 * Chrome for the sign-in pages.
 *
 * Like the public shopfront these render for someone with no session, so they
 * carry none of the app shell.
 *
 * @returns the rendered auth layout.
 */
export function AuthLayout({ title, description, children, footer }: Props) {
  return (
    <div className="flex min-h-full flex-col justify-center bg-gray-50 px-6 py-16">
      <PageTitle title={title} />
      <div className="mx-auto w-full max-w-sm">
        <Link to="/" className="text-sm font-semibold text-indigo-600">
          Acme Pet Care
        </Link>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-gray-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm text-gray-600">{description}</p>
        ) : null}

        <div className="mt-8 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          {children}
        </div>

        {footer ? (
          <p className="mt-6 text-center text-sm text-gray-500">{footer}</p>
        ) : null}
      </div>
    </div>
  );
}

/** Shared classes for the text inputs on these forms. */
export const fieldClass =
  "mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm";

/** Shared classes for the primary submit button. */
export const submitClass =
  "mt-6 w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-50";
