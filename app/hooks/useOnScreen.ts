import * as React from "react";

const isSupported = "IntersectionObserver" in window;

interface ObserverRecord {
  root: Element | Document | null;
  rootMargin: string | undefined;
  threshold: string | undefined;
  observer: IntersectionObserver;
  callbacks: Map<Element, (isIntersecting: boolean) => void>;
  pendingEntries: Map<Element, boolean>;
  animationFrame: number | undefined;
}

const observerRecords: ObserverRecord[] = [];

function getThresholdKey(
  threshold: IntersectionObserverInit["threshold"]
): string | undefined {
  if (Array.isArray(threshold)) {
    return threshold.join(",");
  }

  return threshold?.toString();
}

function getObserverOptions(
  root: Element | Document | null | undefined,
  rootMargin: string | undefined,
  threshold: IntersectionObserverInit["threshold"]
): IntersectionObserverInit {
  const options: IntersectionObserverInit = {};

  if (root !== undefined) {
    options.root = root;
  }
  if (rootMargin !== undefined) {
    options.rootMargin = rootMargin;
  }
  if (threshold !== undefined) {
    options.threshold = threshold;
  }

  return options;
}

function getObserverRecord(
  root: Element | Document | null,
  rootMargin: string | undefined,
  threshold: string | undefined,
  options: IntersectionObserverInit
): ObserverRecord {
  const existingRecord = observerRecords.find(
    (record) =>
      record.root === root &&
      record.rootMargin === rootMargin &&
      record.threshold === threshold
  );

  if (existingRecord) {
    return existingRecord;
  }

  const callbacks = new Map<Element, (isIntersecting: boolean) => void>();
  const pendingEntries = new Map<Element, boolean>();
  let record: ObserverRecord;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      pendingEntries.set(entry.target, entry.isIntersecting);
    }

    if (record.animationFrame !== undefined) {
      return;
    }

    record.animationFrame = requestAnimationFrame(() => {
      record.animationFrame = undefined;

      for (const [element, isIntersecting] of pendingEntries) {
        callbacks.get(element)?.(isIntersecting);
      }
      pendingEntries.clear();
    });
  }, options);

  record = {
    root,
    rootMargin,
    threshold,
    observer,
    callbacks,
    pendingEntries,
    animationFrame: undefined,
  };

  observerRecords.push(record);
  return record;
}

function observeElement(
  element: Element,
  options: IntersectionObserverInit,
  callback: (isIntersecting: boolean) => void
) {
  const root = options.root ?? null;
  const rootMargin = options.rootMargin;
  const threshold = getThresholdKey(options.threshold);
  const record = getObserverRecord(root, rootMargin, threshold, options);

  record.callbacks.set(element, callback);
  record.observer.observe(element);

  return () => {
    record.callbacks.delete(element);
    record.pendingEntries.delete(element);
    record.observer.unobserve(element);

    if (record.callbacks.size > 0) {
      return;
    }

    if (record.animationFrame !== undefined) {
      cancelAnimationFrame(record.animationFrame);
    }

    record.observer.disconnect();

    const index = observerRecords.indexOf(record);
    if (index !== -1) {
      observerRecords.splice(index, 1);
    }
  };
}

// Parses a rootMargin string ("10px 20px" / "10px" / "10px 20px 30px 40px")
// into [top, right, bottom, left] in pixels. Percentages are not supported in
// the synchronous fast path and fall back to 0.
function parseRootMargin(
  rootMargin: string | undefined
): [number, number, number, number] {
  if (!rootMargin) {
    return [0, 0, 0, 0];
  }
  const parts = rootMargin
    .split(/\s+/)
    .map((p) => (p.endsWith("px") ? parseFloat(p) : 0));
  const [t = 0, r = t, b = t, l = r] = parts;
  return [t, r, b, l];
}

/**
 * Hook to return if a given ref is visible on screen.
 *
 * @returns boolean if the node is visible
 */
export default function useOnScreen(
  ref: React.RefObject<HTMLElement>,
  options?: IntersectionObserverInit
) {
  const root = options?.root;
  const rootMargin = options?.rootMargin;
  const threshold = options?.threshold;
  const thresholdKey = getThresholdKey(threshold);

  const [isIntersecting, setIntersecting] = React.useState(!isSupported);
  const isIntersectingRef = React.useRef(isIntersecting);

  const updateIntersecting = React.useCallback((value: boolean) => {
    if (isIntersectingRef.current === value) {
      return;
    }

    isIntersectingRef.current = value;
    setIntersecting(value);
  }, []);

  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return undefined;
    }

    // Synchronous initial check so the first paint is correct.
    const [mt, mr, mb, ml] = parseRootMargin(rootMargin);
    const rect = element.getBoundingClientRect();
    const rootRect =
      root instanceof Element
        ? root.getBoundingClientRect()
        : {
            top: 0,
            left: 0,
            bottom: window.innerHeight,
            right: window.innerWidth,
          };
    const initialVisible =
      rect.bottom >= rootRect.top - mt &&
      rect.top <= rootRect.bottom + mb &&
      rect.right >= rootRect.left - ml &&
      rect.left <= rootRect.right + mr;

    updateIntersecting(initialVisible);

    if (!isSupported) {
      return undefined;
    }

    return observeElement(
      element,
      getObserverOptions(root, rootMargin, threshold),
      updateIntersecting
    );
    // Re-create when option primitives change; options object identity ignored
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, root, rootMargin, thresholdKey, updateIntersecting]);

  return isIntersecting;
}
