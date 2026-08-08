import type { ReactNode } from "react";
import { useEffect } from "react";
import Scene from "~/components/Scene";
import { usePetStore } from "~/stores/petstore";

interface Props {
  /** Title shown in the scene header and browser tab. */
  title: string;
  /** Short description rendered under the title. */
  description?: string;
  /** Actions rendered to the right of the heading. */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Shared frame for the pet store pages.
 *
 * Loads the pet store data once per mount and renders inside Outline's Scene
 * so the sidebar, header and page chrome stay identical to the rest of the app.
 * Tailwind utility classes style the body, which is why the content sits in a
 * plain element rather than a styled-component.
 *
 * @returns the rendered scene.
 */
export function PetStoreScene({
  title,
  description,
  actions,
  children,
}: Props) {
  const fetchAll = usePetStore((state) => state.fetchAll);
  const isLoading = usePetStore((state) => state.isLoading);
  const error = usePetStore((state) => state.error);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return (
    <Scene title={title}>
      <div className="mx-auto w-full max-w-7xl px-1 pb-16">
        <div className="mb-6 md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 text-sm text-gray-500">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="mt-4 flex shrink-0 gap-x-3 md:mt-0 md:ml-4">
              {actions}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading && !error ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : null}

        {children}
      </div>
    </Scene>
  );
}
